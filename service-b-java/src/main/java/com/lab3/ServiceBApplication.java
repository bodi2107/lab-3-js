package com.lab3;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SpringBootApplication
@RestController
@CrossOrigin(origins = "*")
public class ServiceBApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServiceBApplication.class, args);
    }

    @GetMapping("/recommendations")
    public Map<String, Object> getRecommendations(
            @RequestParam String genre,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "optimized") String mode) {

        Map<String, Object> response = new HashMap<>();
        response.put("genre", genre);
        response.put("limit", limit);
        response.put("mode", mode);

        long startTime = System.nanoTime();
        List<Movie> result;

        if ("inefficient".equals(mode)) {
            result = MovieRecommenderInefficient.getTopNByGenreInefficient(genre, limit);
        } else {
            result = MovieRecommenderInefficient.getTopNByGenreOptimized(genre, limit);
        }

        long elapsed = System.nanoTime() - startTime;
        response.put("result", result);
        response.put("response_time_ms", elapsed / 1_000_000.0);
        response.put("count", result.size());

        return response;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
