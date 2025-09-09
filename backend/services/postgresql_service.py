import os
import json
import datetime
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from django.conf import settings
from django.db import connection, transaction


def _now_utc():
    return datetime.datetime.utcnow()


class PostgreSQLService:
    """A Django-friendly port of the TypeScript PostgreSQLService.

    This class uses Django's DB connection for raw SQL execution and provides
    similar methods (register/login/profile/conversation/analytics/etc.).
    """

    def __init__(self):
        self.jwt_secret = getattr(settings, 'JWT_SECRET', os.environ.get('JWT_SECRET', 'your_jwt_secret_here'))
        self.bcrypt_rounds = int(os.environ.get('BCRYPT_ROUNDS', '12'))

    # --- Low-level helpers ---
    def query(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        params = params or []
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            try:
                rows = cursor.fetchall()
            except Exception:
                rows = []

            description = cursor.description
            if description and rows:
                columns = [col[0] for col in description]
                dict_rows = [dict(zip(columns, row)) for row in rows]
            else:
                dict_rows = []

            return {"rows": dict_rows, "rowcount": cursor.rowcount}

    # --- Initialization ---
    def initialize(self) -> None:
        # Try to create the tables used by this service. Requires DB user privileges.
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        first_name VARCHAR(100),
                        last_name VARCHAR(100),
                        is_verified BOOLEAN DEFAULT FALSE,
                        verification_token VARCHAR(255),
                        reset_password_token VARCHAR(255),
                        reset_password_expires TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        token TEXT NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_profiles (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        profile_data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS conversations (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
                        message_text TEXT NOT NULL,
                        context_data JSONB,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_interactions (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        interaction_type VARCHAR(50) NOT NULL,
                        interaction_data JSONB,
                        success BOOLEAN DEFAULT TRUE,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS recommendations (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        recommendation_type VARCHAR(100),
                        recommendation_data JSONB NOT NULL,
                        was_helpful BOOLEAN,
                        feedback TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    ''')

                    # Indexes
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions (user_id)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions (token)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions (expires_at)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles (user_id)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations (timestamp)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions (user_id)')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations (user_id)')

            # If we reached here without exception
        except Exception:
            raise

    # --- Auth methods ---
    def _generate_jwt(self, user_id: str) -> str:
        # default: 7 days
        expires_in = getattr(settings, 'JWT_EXPIRES_IN', os.environ.get('JWT_EXPIRES_IN', '7d'))
        now = datetime.datetime.utcnow()
        if isinstance(expires_in, str) and expires_in.endswith('d'):
            days = int(expires_in[:-1])
            exp = now + datetime.timedelta(days=days)
        else:
            try:
                seconds = int(expires_in)
                exp = now + datetime.timedelta(seconds=seconds)
            except Exception:
                exp = now + datetime.timedelta(days=7)

        payload = {'userId': user_id, 'exp': exp}
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        if isinstance(token, bytes):
            token = token.decode()
        return token

    def register_user(self, email: str, password: str, first_name: Optional[str] = None, last_name: Optional[str] = None) -> Dict[str, Any]:
        # Check exists
        res = self.query('SELECT id FROM users WHERE email = %s', [email])
        if res['rows']:
            raise Exception('User already exists')

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(self.bcrypt_rounds)).decode('utf-8')

        with connection.cursor() as cursor:
            cursor.execute('''
                INSERT INTO users (email, password_hash, first_name, last_name)
                VALUES (%s, %s, %s, %s)
                RETURNING id, email, first_name, last_name, is_verified, created_at, updated_at
            ''', [email, password_hash, first_name, last_name])
            row = cursor.fetchone()

        user = {
            'id': row[0],
            'email': row[1],
            'first_name': row[2],
            'last_name': row[3],
            'is_verified': row[4],
            'created_at': row[5],
            'updated_at': row[6]
        }

        token = self._generate_jwt(user['id'])
        self._create_session(user['id'], token)

        return {'user': user, 'token': token}

    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        res = self.query('''
            SELECT id, email, password_hash, first_name, last_name, is_verified, created_at, updated_at
            FROM users WHERE email = %s
        ''', [email])

        if not res['rows']:
            raise Exception('Invalid credentials')

        user_row = res['rows'][0]
        if not bcrypt.checkpw(password.encode('utf-8'), user_row['password_hash'].encode('utf-8')):
            raise Exception('Invalid credentials')

        token = self._generate_jwt(user_row['id'])
        self._cleanup_expired_sessions()
        self._create_session(user_row['id'], token)

        user = {k: user_row[k] for k in ['id', 'email', 'first_name', 'last_name', 'is_verified', 'created_at', 'updated_at']}
        return {'user': user, 'token': token}

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            decoded = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
        except Exception:
            return None

        res = self.query('''
            SELECT s.id as session_id, s.user_id, u.id, u.email, u.first_name, u.last_name, u.is_verified, u.created_at, u.updated_at
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = %s AND s.expires_at > NOW()
        ''', [token])

        if not res['rows']:
            return None

        session = res['rows'][0]
        # update last_accessed
        with connection.cursor() as cursor:
            cursor.execute('UPDATE user_sessions SET last_accessed = NOW() WHERE id = %s', [session['session_id']])

        return {
            'id': session['user_id'],
            'email': session['email'],
            'first_name': session['first_name'],
            'last_name': session['last_name'],
            'is_verified': session['is_verified'],
            'created_at': session['created_at'],
            'updated_at': session['updated_at']
        }

    def logout(self, token: str) -> None:
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM user_sessions WHERE token = %s', [token])

    def _create_session(self, user_id: str, token: str) -> None:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        with connection.cursor() as cursor:
            cursor.execute('INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)', [user_id, token, expires_at])

    def _cleanup_expired_sessions(self) -> None:
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM user_sessions WHERE expires_at < NOW()')

    # --- Profile methods ---
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        res = self.query('SELECT profile_data FROM user_profiles WHERE user_id = %s', [user_id])
        if not res['rows']:
            return None
        profile_data = res['rows'][0]['profile_data']
        return {**profile_data, 'userId': user_id}

    def save_user_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        profile_json = json.dumps(profile)
        with connection.cursor() as cursor:
            cursor.execute('''
                INSERT INTO user_profiles (user_id, profile_data, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET profile_data = %s, updated_at = CURRENT_TIMESTAMP
            ''', [user_id, profile_json, profile_json])

    def get_all_user_profiles(self) -> List[Dict[str, Any]]:
        res = self.query('SELECT user_id, profile_data FROM user_profiles ORDER BY created_at DESC')
        return [{**row['profile_data'], 'userId': row['user_id']} for row in res['rows']]

    def delete_user_profile(self, user_id: str) -> bool:
        res = self.query('DELETE FROM user_profiles WHERE user_id = %s', [user_id])
        return (res.get('rowcount') or 0) > 0

    # --- Conversation methods ---
    def save_conversation(self, user_id: str, message_type: str, message_text: str, context_data: Optional[Dict[str, Any]] = None) -> None:
        context_json = json.dumps(context_data) if context_data is not None else None
        with connection.cursor() as cursor:
            cursor.execute('INSERT INTO conversations (user_id, message_type, message_text, context_data) VALUES (%s, %s, %s, %s)', [user_id, message_type, message_text, context_json])

    def get_conversation_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        res = self.query('''
            SELECT id, message_type, message_text, context_data, timestamp
            FROM conversations
            WHERE user_id = %s
            ORDER BY timestamp DESC
            LIMIT %s
        ''', [user_id, limit])

        rows = []
        for row in reversed(res['rows']):
            rows.append({
                'id': row.get('id') or f"msg_{int(datetime.datetime.utcnow().timestamp())}_{os.urandom(4).hex()}",
                'userId': user_id,
                'role': row['message_type'],
                'type': row['message_type'],
                'content': row['message_text'],
                'context': row.get('context_data') or {},
                'timestamp': row.get('timestamp')
            })
        return rows

    def clear_conversation_history(self, user_id: str) -> None:
        with connection.cursor() as cursor:
            cursor.execute('DELETE FROM conversations WHERE user_id = %s', [user_id])

    # --- Analytics and interactions ---
    def record_interaction(self, user_id: str, interaction_type: str, interaction_data: Optional[Dict[str, Any]] = None) -> None:
        data_json = json.dumps(interaction_data) if interaction_data is not None else None
        with connection.cursor() as cursor:
            cursor.execute('INSERT INTO user_interactions (user_id, interaction_type, interaction_data) VALUES (%s, %s, %s)', [user_id, interaction_type, data_json])

    def get_interaction_stats(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        # days is interpolated as an int (safe) into the SQL interval
        sql = f'''
            SELECT interaction_type, COUNT(*) as count, COUNT(CASE WHEN success THEN 1 END) as successful_count
            FROM user_interactions
            WHERE user_id = %s AND timestamp > NOW() - INTERVAL '{days} days'
            GROUP BY interaction_type
        '''
        res = self.query(sql, [user_id])
        stats: Dict[str, Any] = {}
        for row in res['rows']:
            total = int(row['count'])
            successful = int(row.get('successful_count') or 0)
            stats[row['interaction_type']] = {
                'count': total,
                'successful': successful,
                'success_rate': (successful / total * 100) if total > 0 else 0
            }
        return stats

    # --- Recommendations ---
    def save_recommendation(self, user_id: str, recommendation_type: str, recommendation_data: Dict[str, Any]) -> None:
        data_json = json.dumps(recommendation_data)
        with connection.cursor() as cursor:
            cursor.execute('INSERT INTO recommendations (user_id, recommendation_type, recommendation_data) VALUES (%s, %s, %s)', [user_id, recommendation_type, data_json])

    def update_recommendation_feedback(self, user_id: str, recommendation_id: str, was_helpful: bool, feedback: Optional[str] = None) -> None:
        with connection.cursor() as cursor:
            cursor.execute('UPDATE recommendations SET was_helpful = %s, feedback = %s WHERE id = %s AND user_id = %s', [was_helpful, feedback, recommendation_id, user_id])

    def get_recommendation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        res = self.query('''
            SELECT id, recommendation_type, recommendation_data, was_helpful, feedback, timestamp
            FROM recommendations
            WHERE user_id = %s
            ORDER BY timestamp DESC
            LIMIT %s
        ''', [user_id, limit])

        return [
            {
                'id': row['id'],
                'type': row['recommendation_type'],
                'data': row['recommendation_data'],
                'wasHelpful': row.get('was_helpful'),
                'feedback': row.get('feedback'),
                'timestamp': row.get('timestamp')
            }
            for row in res['rows']
        ]

    # --- System analytics ---
    def get_user_analytics(self, user_id: str) -> Dict[str, int]:
        conversations = self.query('SELECT COUNT(*) as count FROM conversations WHERE user_id = %s', [user_id])
        interactions = self.query('SELECT COUNT(*) as count FROM user_interactions WHERE user_id = %s', [user_id])
        recommendations = self.query('SELECT COUNT(*) as count FROM recommendations WHERE user_id = %s', [user_id])

        return {
            'totalConversations': int(conversations['rows'][0]['count']) if conversations['rows'] else 0,
            'totalInteractions': int(interactions['rows'][0]['count']) if interactions['rows'] else 0,
            'totalRecommendations': int(recommendations['rows'][0]['count']) if recommendations['rows'] else 0
        }

    def get_system_analytics(self) -> Dict[str, int]:
        users = self.query('SELECT COUNT(*) as count FROM users')
        conv30 = self.query("SELECT COUNT(*) as count FROM conversations WHERE timestamp > NOW() - INTERVAL '30 days'")
        inter30 = self.query("SELECT COUNT(*) as count FROM user_interactions WHERE timestamp > NOW() - INTERVAL '30 days'")

        return {
            'totalUsers': int(users['rows'][0]['count']) if users['rows'] else 0,
            'conversationsLast30Days': int(conv30['rows'][0]['count']) if conv30['rows'] else 0,
            'interactionsLast30Days': int(inter30['rows'][0]['count']) if inter30['rows'] else 0
        }

    # --- Maintenance ---
    def cleanup_old_data(self) -> None:
        retention_days = int(os.environ.get('CONVERSATION_RETENTION_DAYS', '90'))
        analytics_retention = int(os.environ.get('ANALYTICS_RETENTION_DAYS', '365'))
        with connection.cursor() as cursor:
            cursor.execute(f"DELETE FROM conversations WHERE timestamp < NOW() - INTERVAL '{retention_days} days'")
            cursor.execute(f"DELETE FROM user_interactions WHERE timestamp < NOW() - INTERVAL '{analytics_retention} days'")
            cursor.execute('DELETE FROM user_sessions WHERE expires_at < NOW()')

    def close(self) -> None:
        # Django manages connections; nothing to explicitly close here.
        return

    def health_check(self) -> Dict[str, Any]:
        try:
            start = datetime.datetime.utcnow()
            _ = self.query('SELECT 1')
            response_time = int((datetime.datetime.utcnow() - start).total_seconds() * 1000)
            # Can't access pool stats from Django's connection easily
            return {'status': 'healthy', 'details': {'responseTimeMs': response_time}}
        except Exception as e:
            return {'status': 'unhealthy', 'details': {'error': str(e)}}


__all__ = ['PostgreSQLService']
