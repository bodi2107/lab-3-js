#!/bin/bash
# Скрипт для генерации нагрузки на сервис B (сервис A)

echo "=== Генератор нагрузки для Service B (Сервис A) ==="
echo "Отправляем 500 запросов к неоптимизированной версии..."
echo ""

GENRE=${1:-"Action"}
LIMIT=${2:-10}
REQUESTS=${3:-500}
HOST=${4:-"http://localhost:8081"}
MODE=${5:-"inefficient"}

echo "Параметры:"
echo "  Жанр: $GENRE"
echo "  Лимит: $LIMIT"
echo "  Запросы: $REQUESTS"
echo "  Хост: $HOST"
echo "  Режим: $MODE"
echo ""

TOTAL_TIME=0
COUNT=0

for i in $(seq 1 $REQUESTS); do
    START=$(date +%s%N)
    RESPONSE=$(curl -s "$HOST/recommendations?genre=$GENRE&limit=$LIMIT&mode=$MODE")
    END=$(date +%s%N)
    
    TIME=$((($END - $START) / 1000000))  # В миллисекундах
    TOTAL_TIME=$(($TOTAL_TIME + $TIME))
    COUNT=$((COUNT + 1))
    
    if [ $((i % 50)) -eq 0 ]; then
        echo "Запрос $i/$REQUESTS — время ответа: ${TIME}ms"
    fi
done

AVG_TIME=$((TOTAL_TIME / COUNT))
echo ""
echo "=== Результаты ==="
echo "Всего запросов: $COUNT"
echo "Общее время: ${TOTAL_TIME}ms"
echo "Среднее время ответа: ${AVG_TIME}ms"
echo ""
echo "Профайл сохранён в profile.jfr"
echo "Откройте в Java Mission Control для анализа!"
