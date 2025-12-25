#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Service B - Профилирование микросервиса (Python Flask + JFR имитация)
ЛР3: Профилирование и оптимизация микросервисов
"""

from flask import Flask, request, jsonify
import time
import json
import copy
from collections import defaultdict
from typing import List, Dict, Tuple
import psutil
import os

app = Flask(__name__)

# === ДАННЫЕ ФИЛЬМОВ ===
MOVIES = [
    {"id": 1, "title": "The Shawshank Redemption", "year": 1994, "genre": "Drama", "rating": 9.3, "description": "Two imprisoned men bond over a number of years..."},
    {"id": 2, "title": "The Godfather", "year": 1972, "genre": "Crime", "rating": 9.2, "description": "The aging patriarch of an organized crime dynasty..."},
    {"id": 3, "title": "The Dark Knight", "year": 2008, "genre": "Action", "rating": 9.0, "description": "When the menace known as the Joker wreaks havoc..."},
    {"id": 4, "title": "Pulp Fiction", "year": 1994, "genre": "Crime", "rating": 8.9, "description": "The lives of two mob hitmen, a boxer, a gangster..."},
    {"id": 5, "title": "Forrest Gump", "year": 1994, "genre": "Drama", "rating": 8.8, "description": "The presidencies of Kennedy and Johnson unfold..."},
    {"id": 6, "title": "Inception", "year": 2010, "genre": "Action", "rating": 8.8, "description": "A thief who steals corporate secrets through dream-sharing..."},
    {"id": 7, "title": "Fight Club", "year": 1999, "genre": "Drama", "rating": 8.8, "description": "An insomniac office worker and a devil-may-care soap maker..."},
    {"id": 8, "title": "The Matrix", "year": 1999, "genre": "Action", "rating": 8.7, "description": "A computer programmer discovers that reality as he knows it..."},
    {"id": 9, "title": "Goodfellas", "year": 1990, "genre": "Crime", "rating": 8.7, "description": "The story of Henry Hill and his life in the mob..."},
    {"id": 10, "title": "The Silence of the Lambs", "year": 1991, "genre": "Thriller", "rating": 8.6, "description": "A young FBI cadet must receive help from an incarcerated..."},
    {"id": 11, "title": "Saving Private Ryan", "year": 1998, "genre": "Action", "rating": 8.6, "description": "Following the Normandy Landings, a group of U.S. soldiers..."},
    {"id": 12, "title": "Jurassic Park", "year": 1993, "genre": "Action", "rating": 8.2, "description": "A pragmatic paleontologist touring an almost complete theme park..."},
    {"id": 13, "title": "The Avengers", "year": 2012, "genre": "Action", "rating": 8.0, "description": "Earth's mightiest heroes must come together..."},
    {"id": 14, "title": "Avatar", "year": 2009, "genre": "Action", "rating": 7.9, "description": "A paraplegic Marine dispatched to the moon Pandora..."},
    {"id": 15, "title": "Interstellar", "year": 2014, "genre": "Drama", "rating": 8.6, "description": "A team of explorers travel through a wormhole in space..."},
]

# === СЧЁТЧИКИ ПРОФИЛИРОВАНИЯ ===
profiling_data = {
    'inefficient': {
        'calls': 0,
        'total_time': 0.0,
        'measurements': [],
        'total_memory': 0.0,
    },
    'optimized': {
        'calls': 0,
        'total_time': 0.0,
        'measurements': [],
        'total_memory': 0.0,
    }
}

# === НЕОПТИМИЗИРОВАННАЯ ВЕРСИЯ (Hot Spots) ===
def get_top_n_by_genre_inefficient(genre: str, limit: int) -> Tuple[List[Dict], float, float]:
    """
    Неоптимизированная версия с явными hot spots:
    - HOT SPOT 1: Дублирование массива 3 раза
    - HOT SPOT 2: Объединение 300 элементов вместо 100
    - HOT SPOT 3: Фильтрация из 300 элементов
    - HOT SPOT 4: Первая сортировка (по названию)
    - HOT SPOT 5: Вторая сортировка (по рейтингу) - перезаписывает первую
    """
    start_time = time.perf_counter()
    process = psutil.Process(os.getpid())
    start_memory = process.memory_info().rss / 1024 / 1024  # MB

    # HOT SPOT 1: Дублирование массива 3 раза (глубокое копирование)
    copy1 = copy.deepcopy(MOVIES)
    copy2 = copy.deepcopy(MOVIES)
    copy3 = copy.deepcopy(MOVIES)

    # HOT SPOT 2: Объединение трёх копий (300 элементов вместо 100)
    merged = copy1 + copy2 + copy3

    # HOT SPOT 3: Фильтрация из 300 элементов
    filtered = [m for m in merged if m['genre'] == genre]

    # HOT SPOT 4: Первая сортировка (по названию)
    sorted_by_title = sorted(filtered, key=lambda m: m['title'])

    # HOT SPOT 5: Вторая сортировка (по рейтингу) - перезаписывает первую, неэффективно
    sorted_by_rating = sorted(sorted_by_title, key=lambda m: m['rating'], reverse=True)

    # HOT SPOT 6: Создание промежуточного результата
    result = sorted_by_rating[:limit]

    end_time = time.perf_counter()
    end_memory = process.memory_info().rss / 1024 / 1024
    
    elapsed_ms = (end_time - start_time) * 1000
    allocated_mb = end_memory - start_memory

    return result, elapsed_ms, allocated_mb


# === ОПТИМИЗИРОВАННАЯ ВЕРСИЯ (Best Practices) ===
def get_top_n_by_genre_optimized(genre: str, limit: int) -> Tuple[List[Dict], float, float]:
    """
    Оптимизированная версия:
    - Один поток обработки (filter → sort → slice)
    - Одна сортировка (по рейтингу)
    - Никаких промежуточных копий
    - Ленивое вычисление
    """
    start_time = time.perf_counter()
    process = psutil.Process(os.getpid())
    start_memory = process.memory_info().rss / 1024 / 1024

    # Оптимизированный поток:
    result = (
        sorted(
            [m for m in MOVIES if m['genre'] == genre],
            key=lambda m: m['rating'],
            reverse=True
        )[:limit]
    )

    end_time = time.perf_counter()
    end_memory = process.memory_info().rss / 1024 / 1024
    
    elapsed_ms = (end_time - start_time) * 1000
    allocated_mb = end_memory - start_memory

    return result, elapsed_ms, allocated_mb


# === REST API ENDPOINTS ===

@app.route('/recommendations', methods=['GET'])
def recommendations():
    """
    Эндпойнт получения рекомендаций фильмов.
    
    Параметры:
    - genre: жанр (default: Action)
    - limit: количество результатов (default: 10)
    - mode: режим (inefficient или optimized, default: optimized)
    """
    genre = request.args.get('genre', 'Action')
    limit = int(request.args.get('limit', 10))
    mode = request.args.get('mode', 'optimized')

    if mode == 'inefficient':
        result, elapsed_ms, allocated_mb = get_top_n_by_genre_inefficient(genre, limit)
        profiling_data['inefficient']['calls'] += 1
        profiling_data['inefficient']['total_time'] += elapsed_ms
        profiling_data['inefficient']['measurements'].append(elapsed_ms)
        profiling_data['inefficient']['total_memory'] += allocated_mb
    else:
        result, elapsed_ms, allocated_mb = get_top_n_by_genre_optimized(genre, limit)
        profiling_data['optimized']['calls'] += 1
        profiling_data['optimized']['total_time'] += elapsed_ms
        profiling_data['optimized']['measurements'].append(elapsed_ms)
        profiling_data['optimized']['total_memory'] += allocated_mb

    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {mode.upper():12s} | Genre: {genre:10s} | Limit: {limit:3d} | Time: {elapsed_ms:8.2f}ms | Memory: {allocated_mb:8.2f}MB")

    return jsonify({
        'genre': genre,
        'limit': limit,
        'mode': mode,
        'result': result,
        'response_time_ms': round(elapsed_ms, 2),
        'allocated_mb': round(allocated_mb, 2),
        'count': len(result)
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})


@app.route('/profiling-report', methods=['GET'])
def profiling_report():
    """Получить отчёт профилирования"""
    
    inefficient_avg = (
        profiling_data['inefficient']['total_time'] / profiling_data['inefficient']['calls']
        if profiling_data['inefficient']['calls'] > 0
        else 0
    )
    
    optimized_avg = (
        profiling_data['optimized']['total_time'] / profiling_data['optimized']['calls']
        if profiling_data['optimized']['calls'] > 0
        else 0
    )
    
    improvement = (
        ((inefficient_avg - optimized_avg) / inefficient_avg * 100)
        if inefficient_avg > 0
        else 0
    )

    inefficient_measurements = profiling_data['inefficient']['measurements']
    optimized_measurements = profiling_data['optimized']['measurements']

    return jsonify({
        'summary': {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'profiling_enabled': True
        },
        'inefficient': {
            'calls': profiling_data['inefficient']['calls'],
            'avg_response_time_ms': round(inefficient_avg, 2),
            'total_allocations_mb': round(profiling_data['inefficient']['total_memory'], 2),
            'min_time_ms': round(min(inefficient_measurements), 2) if inefficient_measurements else 0,
            'max_time_ms': round(max(inefficient_measurements), 2) if inefficient_measurements else 0,
        },
        'optimized': {
            'calls': profiling_data['optimized']['calls'],
            'avg_response_time_ms': round(optimized_avg, 2),
            'total_allocations_mb': round(profiling_data['optimized']['total_memory'], 2),
            'min_time_ms': round(min(optimized_measurements), 2) if optimized_measurements else 0,
            'max_time_ms': round(max(optimized_measurements), 2) if optimized_measurements else 0,
        },
        'improvement': {
            'response_time_improvement_percent': round(improvement, 1),
            'estimated_speedup': round(inefficient_avg / max(optimized_avg, 0.001), 1) if optimized_avg > 0 else 0
        }
    })


@app.route('/profiling-reset', methods=['POST'])
def profiling_reset():
    """Сбросить данные профилирования"""
    global profiling_data
    profiling_data = {
        'inefficient': {'calls': 0, 'total_time': 0.0, 'measurements': [], 'total_memory': 0.0},
        'optimized': {'calls': 0, 'total_time': 0.0, 'measurements': [], 'total_memory': 0.0}
    }
    return jsonify({'status': 'profiling data reset'})


# === ЗАПУСК СЕРВЕРА ===
if __name__ == '__main__':
    print("""
╔════════════════════════════════════════════════════════╗
║   Service B - Профилирование микросервиса (Python)    ║
║              с имитацией Java JFR                      ║
╚════════════════════════════════════════════════════════╝

🚀 Сервер запущен на http://localhost:8081

📊 Доступные эндпойнты:
  • GET /recommendations?genre=Action&limit=10&mode=inefficient|optimized
  • GET /health
  • GET /profiling-report
  • POST /profiling-reset

🔬 Команды профилирования в PowerShell:
  
  Неоптимизированная версия (500 запросов):
  for ($i=1; $i -le 500; $i++) { 
    curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=inefficient"
  }

  Оптимизированная версия (500 запросов):
  for ($i=1; $i -le 500; $i++) { 
    curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=optimized"
  }

  Просмотр отчёта профилирования:
  curl http://localhost:8081/profiling-report | ConvertFrom-Json | ConvertTo-Json -Depth 10

════════════════════════════════════════════════════════
""")
    app.run(host='0.0.0.0', port=8081, debug=False, use_reloader=False)
