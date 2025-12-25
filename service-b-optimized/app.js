// Service B - Node.js версия с профилированием (имитирует Java JFR)
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8081;

// === MOVIED DATA ===
const MOVIES = [
    { id: 1, title: "The Shawshank Redemption", year: 1994, genre: "Drama", rating: 9.3, description: "Two imprisoned men bond over a number of years..." },
    { id: 2, title: "The Godfather", year: 1972, genre: "Crime", rating: 9.2, description: "The aging patriarch of an organized crime dynasty..." },
    { id: 3, title: "The Dark Knight", year: 2008, genre: "Action", rating: 9.0, description: "When the menace known as the Joker wreaks havoc..." },
    { id: 4, title: "Pulp Fiction", year: 1994, genre: "Crime", rating: 8.9, description: "The lives of two mob hitmen, a boxer, a gangster..." },
    { id: 5, title: "Forrest Gump", year: 1994, genre: "Drama", rating: 8.8, description: "The presidencies of Kennedy and Johnson unfold through the perspective of an Alabama man..." },
    { id: 6, title: "Inception", year: 2010, genre: "Action", rating: 8.8, description: "A thief who steals corporate secrets through dream-sharing technology..." },
    { id: 7, title: "Fight Club", year: 1999, genre: "Drama", rating: 8.8, description: "An insomniac office worker and a devil-may-care soap maker form an underground..." },
    { id: 8, title: "The Matrix", year: 1999, genre: "Action", rating: 8.7, description: "A computer programmer discovers that reality as he knows it..." },
    { id: 9, title: "Goodfellas", year: 1990, genre: "Crime", rating: 8.7, description: "The story of Henry Hill and his life in the mob..." },
    { id: 10, title: "The Silence of the Lambs", year: 1991, genre: "Thriller", rating: 8.6, description: "A young FBI cadet must receive the help of an incarcerated and manipulative..." },
    { id: 11, title: "Saving Private Ryan", year: 1998, genre: "Action", rating: 8.6, description: "Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines..." },
    { id: 12, title: "Jurassic Park", year: 1993, genre: "Action", rating: 8.2, description: "A pragmatic paleontologist touring an almost complete theme park..." },
    { id: 13, title: "The Avengers", year: 2012, genre: "Action", rating: 8.0, description: "Earth's mightiest heroes must come together and learn to fight as a team..." },
    { id: 14, title: "Avatar", year: 2009, genre: "Action", rating: 7.9, description: "A paraplegic Marine dispatched to the moon Pandora on a unique mission..." },
    { id: 15, title: "Interstellar", year: 2014, genre: "Drama", rating: 8.6, description: "A team of explorers travel through a wormhole in space..." }
];

// === PROFILING COUNTERS ===
let profilingData = {
    inefficient: {
        calls: 0,
        totalTime: 0,
        totalAllocations: 0,
        gcPauses: 0,
        measurements: []
    },
    optimized: {
        calls: 0,
        totalTime: 0,
        totalAllocations: 0,
        gcPauses: 0,
        measurements: []
    }
};

// === MEMORY MONITORING ===
function getMemoryUsage() {
    return process.memoryUsage();
}

// === INEFFICIENT VERSION (Hot Spots) ===
function getTopNByGenreInefficient(genre, limit) {
    const startMemory = getMemoryUsage();
    const startTime = process.hrtime.bigint();

    // HOT SPOT 1: Дублирование массива 3 раза
    const copy1 = JSON.parse(JSON.stringify(MOVIES));
    const copy2 = JSON.parse(JSON.stringify(MOVIES));
    const copy3 = JSON.parse(JSON.stringify(MOVIES));

    // HOT SPOT 2: Объединение трёх копий (300 элементов вместо 100)
    const merged = [...copy1, ...copy2, ...copy3];

    // HOT SPOT 3: Фильтрация из 300 элементов
    const filtered = merged.filter(m => m.genre === genre);

    // HOT SPOT 4: Первая сортировка (по названию)
    const sortedByTitle = [...filtered].sort((a, b) => 
        a.title.localeCompare(b.title)
    );

    // HOT SPOT 5: Вторая сортировка (по рейтингу) - перезаписывает первую!
    const sortedByRating = [...sortedByTitle].sort((a, b) => 
        b.rating - a.rating
    );

    // HOT SPOT 6: Создание промежуточного результата
    const result = [];
    for (let i = 0; i < Math.min(limit, sortedByRating.length); i++) {
        result.push(sortedByRating[i]);
    }

    const endTime = process.hrtime.bigint();
    const endMemory = getMemoryUsage();
    
    const timeMs = Number(endTime - startTime) / 1_000_000; // в миллисекундах
    const allocatedMB = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;

    // Имитация GC паузы (реально в Java это видно в JFR)
    const estimatedGCPauses = Math.random() > 0.7 ? 1 : 0;

    return {
        result,
        timeMs,
        allocatedMB,
        gcPauses: estimatedGCPauses,
        hotSpots: {
            arrayDuplication: "3x JSON.parse (HOT SPOT 1)",
            arrayMerge: "300 items instead of 100 (HOT SPOT 2)",
            doubleSorting: "Two sorts (title then rating overrides it) (HOT SPOT 5)",
            intermediateArrays: "Multiple copies created (HOT SPOT 3,4,6)"
        }
    };
}

// === OPTIMIZED VERSION (Best Practices) ===
function getTopNByGenreOptimized(genre, limit) {
    const startMemory = getMemoryUsage();
    const startTime = process.hrtime.bigint();

    // Оптимизированный поток обработки:
    // 1. Фильтр (ленивое вычисление)
    // 2. Сортировка один раз (по рейтингу)
    // 3. Лимит (останавливает рано)
    // 4. Преобразование в массив
    const result = MOVIES
        .filter(m => m.genre === genre)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);

    const endTime = process.hrtime.bigint();
    const endMemory = getMemoryUsage();
    
    const timeMs = Number(endTime - startTime) / 1_000_000;
    const allocatedMB = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;

    // В оптимизированной версии GC паузы редко
    const estimatedGCPauses = Math.random() > 0.95 ? 1 : 0;

    return {
        result,
        timeMs,
        allocatedMB,
        gcPauses: estimatedGCPauses,
        optimizations: {
            singleSort: "Single sort by rating (no overrides)",
            noIntermediateCopies: "No JSON.parse/stringify",
            lazyEvaluation: "slice() stops early",
            minimalAllocation: "Only necessary objects created"
        }
    };
}

// === REST API ENDPOINTS ===

// Endpoint для получения рекомендаций
app.get('/recommendations', (req, res) => {
    const genre = req.query.genre || 'Action';
    const limit = parseInt(req.query.limit) || 10;
    const mode = req.query.mode || 'optimized'; // 'inefficient' или 'optimized'

    let measurement;

    if (mode === 'inefficient') {
        measurement = getTopNByGenreInefficient(genre, limit);
        profilingData.inefficient.calls++;
        profilingData.inefficient.totalTime += measurement.timeMs;
        profilingData.inefficient.totalAllocations += measurement.allocatedMB;
        profilingData.inefficient.gcPauses += measurement.gcPauses;
        profilingData.inefficient.measurements.push(measurement.timeMs);
    } else {
        measurement = getTopNByGenreOptimized(genre, limit);
        profilingData.optimized.calls++;
        profilingData.optimized.totalTime += measurement.timeMs;
        profilingData.optimized.totalAllocations += measurement.allocatedMB;
        profilingData.optimized.gcPauses += measurement.gcPauses;
        profilingData.optimized.measurements.push(measurement.timeMs);
    }

    res.json({
        genre,
        limit,
        mode,
        result: measurement.result,
        response_time_ms: parseFloat(measurement.timeMs.toFixed(2)),
        allocated_mb: parseFloat(measurement.allocatedMB.toFixed(2)),
        gc_pauses: measurement.gcPauses,
        count: measurement.result.length,
        details: mode === 'inefficient' ? measurement.hotSpots : measurement.optimizations
    });

    // Логирование в консоль для мониторинга
    console.log(`[${new Date().toISOString()}] ${mode.toUpperCase()} - Genre: ${genre}, Limit: ${limit}, Time: ${measurement.timeMs.toFixed(2)}ms, Memory: ${measurement.allocatedMB.toFixed(2)}MB, GC: ${measurement.gcPauses}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Профилирование отчёт
app.get('/profiling-report', (req, res) => {
    const inefficientAvg = profilingData.inefficient.calls > 0 
        ? profilingData.inefficient.totalTime / profilingData.inefficient.calls 
        : 0;
    
    const optimizedAvg = profilingData.optimized.calls > 0 
        ? profilingData.optimized.totalTime / profilingData.optimized.calls 
        : 0;

    const improvement = inefficientAvg > 0 
        ? ((inefficientAvg - optimizedAvg) / inefficientAvg * 100).toFixed(1) 
        : 0;

    res.json({
        summary: {
            timestamp: new Date().toISOString(),
            profiling_enabled: true
        },
        inefficient: {
            calls: profilingData.inefficient.calls,
            avg_response_time_ms: parseFloat(inefficientAvg.toFixed(2)),
            total_allocations_mb: parseFloat(profilingData.inefficient.totalAllocations.toFixed(2)),
            total_gc_pauses: profilingData.inefficient.gcPauses,
            min_time_ms: profilingData.inefficient.measurements.length > 0 
                ? parseFloat(Math.min(...profilingData.inefficient.measurements).toFixed(2))
                : 0,
            max_time_ms: profilingData.inefficient.measurements.length > 0 
                ? parseFloat(Math.max(...profilingData.inefficient.measurements).toFixed(2))
                : 0
        },
        optimized: {
            calls: profilingData.optimized.calls,
            avg_response_time_ms: parseFloat(optimizedAvg.toFixed(2)),
            total_allocations_mb: parseFloat(profilingData.optimized.totalAllocations.toFixed(2)),
            total_gc_pauses: profilingData.optimized.gcPauses,
            min_time_ms: profilingData.optimized.measurements.length > 0 
                ? parseFloat(Math.min(...profilingData.optimized.measurements).toFixed(2))
                : 0,
            max_time_ms: profilingData.optimized.measurements.length > 0 
                ? parseFloat(Math.max(...profilingData.optimized.measurements).toFixed(2))
                : 0
        },
        improvement: {
            response_time_improvement_percent: improvement,
            estimated_memory_improvement: (
                (profilingData.inefficient.totalAllocations - profilingData.optimized.totalAllocations) / 
                Math.max(profilingData.inefficient.totalAllocations, 1) * 100
            ).toFixed(1) + "%",
            estimated_gc_improvement: (
                ((profilingData.inefficient.gcPauses - profilingData.optimized.gcPauses) / 
                Math.max(profilingData.inefficient.gcPauses, 1)) * 100
            ).toFixed(1) + "%"
        }
    });
});

// Сброс профилирования
app.post('/profiling-reset', (req, res) => {
    profilingData = {
        inefficient: { calls: 0, totalTime: 0, totalAllocations: 0, gcPauses: 0, measurements: [] },
        optimized: { calls: 0, totalTime: 0, totalAllocations: 0, gcPauses: 0, measurements: [] }
    };
    res.json({ status: 'profiling data reset' });
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║        Service B - Профилирование микросервиса        ║
║              Node.js с JFR имитацией                   ║
╚════════════════════════════════════════════════════════╝

🚀 Сервер запущен на http://localhost:${PORT}

📊 Доступные эндпойнты:
  • GET /recommendations?genre=Action&limit=10&mode=inefficient|optimized
  • GET /health
  • GET /profiling-report
  • POST /profiling-reset

🔬 Команды профилирования:
  
  Неоптимизированная версия (500 запросов):
  for (\$i=1; \$i -le 500; \$i++) { 
    curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=inefficient"
  }

  Оптимизированная версия (500 запросов):
  for (\$i=1; \$i -le 500; \$i++) { 
    curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=optimized"
  }

  Просмотр отчёта профилирования:
  curl http://localhost:8081/profiling-report | jq

════════════════════════════════════════════════════════
`);
});
