# ЛР3: Профилирование и оптимизация микросервисов

## Требования методички

**ЛР2 (основа):**
- Сервис A → отправляет жанр
- Сервис B → возвращает top-N фильмов по жанру

**ЛР3 (профилирование и оптимизация):**
1. Запустить сервис B с JFR профилированием
2. Запустить сервис A для генерации нагрузки
3. Собрать .jfr файл и анализировать в JMC
4. Найти hot spots (CPU, allocations)
5. Оптимизировать код
6. Повторно профилировать и сравнить результаты

---

## Структура проекта

```
service-b-java/
├── pom.xml                              # Maven конфигурация
├── src/main/java/com/lab3/
│   ├── Movie.java                       # Модель фильма
│   ├── MovieRecommender.java            # Неопт. и оптим. алгоритмы
│   └── ServiceBApplication.java         # Spring Boot приложение
├── src/main/resources/
│   └── application.properties           # Конфиг (порт 8081)
└── PROFILING.md                         # Инструкции профилирования
```

---

## Запуск и профилирование

### 1. Сборка проекта

```bash
cd service-b-java
mvn clean package
```

### 2. Запуск с JFR (Java Flight Recorder)

**Версия ДО оптимизации (с hot spots):**
```bash
java -XX:StartFlightRecording=filename=profile-inefficient.jfr,dumponexit=true -jar target/service-b-1.0-SNAPSHOT.jar
```

**Версия ПОСЛЕ оптимизации:**
```bash
java -XX:StartFlightRecording=filename=profile-optimized.jfr,dumponexit=true -jar target/service-b-1.0-SNAPSHOT.jar
```

### 3. Генерация нагрузки (сервис A)

В отдельном терминале (пока работает сервис B):

```bash
# Установить curl (если нет)
# Ubuntu: sudo apt-get install curl
# Windows: обычно есть встроенный

# Отправить 500 запросов к неоптимизированной версии
for i in {1..500}; do
  curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=inefficient"
done

# Или через PowerShell (Windows):
for ($i=1; $i -le 500; $i++) { 
  curl.exe "http://localhost:8081/recommendations?genre=Action&limit=10&mode=inefficient"
}
```

### 4. Сбор профиля

- Остановить сервис (Ctrl+C) → автоматически сохранится `profile-inefficient.jfr`

### 5. Анализ в Java Mission Control (JMC)

1. Скачать **Java Mission Control** (идёт с JDK или отдельно)
2. Открыть: `File → Open File` → выбрать `profile-inefficient.jfr`
3. Смотреть:
   - **Method Profiling** → Hot methods (сортировка, фильтрация)
   - **Memory** → allocations (дублирование массивов)
   - **GC** → pause times (сборка мусора)

---

## Hot Spots (Узкие места)

### НЕНЕОПТИМИЗИРОВАННАЯ версия:

```java
// HOT SPOT 1: Дублирование массивов
List<Movie> copy1 = new ArrayList<>(MOVIES);  // ~100 объектов
List<Movie> copy2 = new ArrayList<>(MOVIES);  // ~100 объектов
List<Movie> copy3 = new ArrayList<>(MOVIES);  // ~100 объектов

// HOT SPOT 2: Объединение
List<Movie> merged = new ArrayList<>();
merged.addAll(copy1);  // 100
merged.addAll(copy2);  // 200
merged.addAll(copy3);  // 300 (!)

// HOT SPOT 3: Фильтрация
List<Movie> filtered = new ArrayList<>();
for (Movie m : merged) {  // 300 итераций
    if (m.getGenre() != null && m.getGenre().equalsIgnoreCase(genre)) {
        filtered.add(m);
    }
}

// HOT SPOT 4 & 5: ДВЕ сортировки
filtered.sort((a, b) -> a.getTitle().compareTo(b.getTitle()));    // Первая
filtered.sort((a, b) -> Double.compare(b.getRating(), a.getRating())); // Вторая (перезаписывает)
```

**Проблемы:**
- 📦 Выделено ~300 объектов фильмов + 3 копии списков
- 🔄 Две сортировки вместо одной
- ⏱️ Лишние проходы по данным
- 🗑️ Много мусора для GC

---

## Оптимизированная версия:

```java
public static List<Movie> getTopNByGenreOptimized(String genre, int limit) {
    return MOVIES.stream()
            .filter(m -> m.getGenre() != null && m.getGenre().equalsIgnoreCase(genre))
            .sorted((a, b) -> Double.compare(b.getRating(), a.getRating()))
            .limit(limit)
            .toList();
}
```

**Улучшения:**
- ✅ Без промежуточных копий → ↓ allocations
- ✅ Одна сортировка → ↓ CPU time
- ✅ Stream.limit() останавливает обработку раньше → ↓ GC
- ✅ Ленивые вычисления (lazy evaluation)

---

## Ожидаемые результаты профилирования

| Метрика | До оптимизации | После оптимизации | Улучшение |
|---------|---|---|---|
| Response Time | ~50-100 ms | ~5-10 ms | 5-10x |
| CPU Usage | ~30% | ~5% | 6x |
| Allocations | ~10-15 MB | ~1-2 MB | 10x |
| GC Pauses | 5-10 pauses | 0-1 pause | значительно |

---

## Тестирование обеих версий

```bash
# Terminal 1: Запустить сервис
java -XX:StartFlightRecording=filename=profile.jfr,dumponexit=true -jar target/service-b-1.0-SNAPSHOT.jar

# Terminal 2: Тестировать (пока работает сервис)
curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=inefficient"
# Result: медленнее, больше allocations

curl "http://localhost:8081/recommendations?genre=Action&limit=10&mode=optimized"
# Result: быстрее, меньше allocations

# Повторить 500 раз для статистики
```

---

## Команды для Async Profiler (дополнительно)

Если нужны красивые flame graphs:

```bash
# CPU профилирование
./profiler.sh -e cpu -f cpu.html -d 30 <PID>

# Allocation профилирование
./profiler.sh -e alloc -f alloc.html -d 30 <PID>
```

---

## Отчёт (что писать в защиту)

1. **Проблема:** Описать hot spots (дублирование, двойная сортировка)
2. **Доказательство:** Скриншоты из JMC (Method Profiling, Memory)
3. **Решение:** Показать оптимизированный код
4. **Результат:** Таблица с метриками до/после
5. **Вывод:** Оптимизация дала X-кратное ускорение

---

## Инструменты

- **JFR** — встроенный профайлер (не требует установки)
- **JMC** — GUI для анализа .jfr файлов
- **Async Profiler** — опционально для flame graphs
- **Spring Boot** — веб-фреймворк

