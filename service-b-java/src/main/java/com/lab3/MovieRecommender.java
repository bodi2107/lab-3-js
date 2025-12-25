package com.lab3;

import java.util.*;

/**
 * НЕОПТИМИЗИРОВАННАЯ версия (ЛР3 — До оптимизации)
 * Hot spots:
 * - Дублирование массивов 3 раза (неэффективное использование памяти)
 * - Двойная сортировка (сначала по названию, потом по рейтингу)
 * - Создание промежуточных списков
 */
public class MovieRecommenderInefficient {

    private static final List<Movie> MOVIES = new ArrayList<>();

    static {
        // Инициализируем фильмы (100 фильмов)
        initializeMovies();
    }

    public static List<Movie> getTopNByGenreInefficient(String genre, int limit) {
        long startTime = System.nanoTime();

        // HOT SPOT 1: Дублирование массивов (создание мусора)
        List<Movie> copy1 = new ArrayList<>(MOVIES);
        List<Movie> copy2 = new ArrayList<>(MOVIES);
        List<Movie> copy3 = new ArrayList<>(MOVIES);

        // HOT SPOT 2: Объединение копий
        List<Movie> merged = new ArrayList<>();
        merged.addAll(copy1);
        merged.addAll(copy2);
        merged.addAll(copy3);

        // HOT SPOT 3: Фильтрация
        List<Movie> filtered = new ArrayList<>();
        for (Movie m : merged) {
            if (m.getGenre() != null && m.getGenre().equalsIgnoreCase(genre)) {
                filtered.add(m);
            }
        }

        // HOT SPOT 4: ПЕРВАЯ сортировка (по названию)
        filtered.sort((a, b) -> a.getTitle().compareTo(b.getTitle()));

        // HOT SPOT 5: ВТОРАЯ сортировка (по рейтингу) — перезаписывает первую
        filtered.sort((a, b) -> Double.compare(b.getRating(), a.getRating()));

        // HOT SPOT 6: Limit и преобразование DTO
        List<Movie> result = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, filtered.size()); i++) {
            result.add(filtered.get(i));
        }

        long elapsed = System.nanoTime() - startTime;
        System.out.printf("INEFFICIENT: Processed %d movies in %.2f ms%n", result.size(), elapsed / 1_000_000.0);

        return result;
    }

    /**
     * ОПТИМИЗИРОВАННАЯ версия (ЛР3 — После оптимизации)
     * Улучшения:
     * - Без дублирования (убраны лишние копии)
     * - Одна сортировка
     * - Использование Stream API для limit()
     */
    public static List<Movie> getTopNByGenreOptimized(String genre, int limit) {
        long startTime = System.nanoTime();

        // Прямая фильтрация и сортировка (БЕЗ промежуточных копий)
        List<Movie> result = MOVIES.stream()
                .filter(m -> m.getGenre() != null && m.getGenre().equalsIgnoreCase(genre))
                .sorted((a, b) -> Double.compare(b.getRating(), a.getRating()))
                .limit(limit)
                .toList();

        long elapsed = System.nanoTime() - startTime;
        System.out.printf("OPTIMIZED: Processed %d movies in %.2f ms%n", result.size(), elapsed / 1_000_000.0);

        return result;
    }

    private static void initializeMovies() {
        // 100 фильмов (как в movies-large.json)
        String[] titles = {
                "The Shawshank Redemption", "The Godfather", "The Dark Knight", "Pulp Fiction",
                "Forrest Gump", "Inception", "The Matrix", "Interstellar",
                "The Lord of the Rings", "Fight Club", "Spirited Away", "Parasite",
                "Gladiator", "The Silence of the Lambs", "Se7en", "The Usual Suspects",
                "Schindler's List", "Saving Private Ryan", "Jurassic Park", "Titanic",
                "Avatar", "The Avengers", "The Lion King", "Toy Story",
                "The Shining", "The Exorcist", "Jaws", "Aliens",
                "The Terminator", "Predator", "Die Hard", "Lethal Weapon",
                "Total Recall", "RoboCop", "The Fifth Element", "Blade Runner",
                "2001: A Space Odyssey", "Back to the Future", "Ghostbusters", "Singin' in the Rain",
                "Some Like It Hot", "It's a Wonderful Life", "Casablanca", "Citizen Kane",
                "Gone with the Wind", "The Godfather Part II", "The Godfather Part III", "Once Upon a Time in the West",
                "The Good, the Bad and the Ugly", "A Fistful of Dollars", "Rear Window", "Vertigo",
                "Psycho", "M", "Nosferatu", "Metropolis",
                "The Cabinet of Dr. Caligari", "Citizen X", "In the Mood for Love", "Amélie",
                "Pan's Labyrinth", "The Shape of Water", "Moonlight", "Whiplash",
                "La La Land", "Manchester by the Sea", "Hidden Figures", "The Help",
                "12 Years a Slave", "Lincoln", "Dunkirk", "Tenet",
                "Oppenheimer", "The Irishman", "Once Upon a Time in Hollywood", "Knives Out",
                "The Lighthouse", "Black Panther", "Aquaman", "Wonder Woman",
                "Ready Player One", "Blade Runner 2049", "Arrival", "Ex Machina",
                "Annihilation", "Dune", "The Matrix Resurrections", "The Wandering Earth",
                "Three-Body", "Godzilla vs. Kong", "Red Notice", "Free Guy",
                "Army of the Dead", "Death on the Nile", "Everything Everywhere All at Once", "Top Gun: Maverick"
        };

        String[] genres = {"Action", "Drama", "Crime", "Sci-Fi", "Fantasy", "Animation", "Thriller", "Comedy", "Romance", "Horror"};
        double[] ratings = {9.3, 9.2, 9.0, 8.9, 8.8, 8.7, 8.6, 8.5, 8.4, 8.3, 8.2, 8.1, 8.0, 7.9, 7.8, 7.7, 7.6, 7.5, 7.4, 7.3, 7.2, 7.1, 7.0, 6.9, 6.8};

        for (int i = 0; i < 100; i++) {
            MOVIES.add(new Movie(
                    201 + i,
                    titles[i % titles.length] + " (" + (i / titles.length + 1) + ")",
                    1990 + (i % 35),
                    genres[i % genres.length],
                    ratings[i % ratings.length],
                    "Описание фильма " + (201 + i),
                    "https://via.placeholder.com/400x600?text=" + titles[i % titles.length]
            ));
        }
    }
}
