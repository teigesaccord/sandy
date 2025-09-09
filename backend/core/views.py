from django.shortcuts import render
from django.http import JsonResponse


def custom_404(request, exception):
    return render(request, '404.html', status=404)


def custom_500(request):
    return render(request, '500.html', status=500)


def health(request):
    return JsonResponse({'status': 'ok'})
