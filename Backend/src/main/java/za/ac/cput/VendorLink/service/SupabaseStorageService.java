package za.ac.cput.VendorLink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class SupabaseStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @Value("${app.supabase.url:https://ahyhdieaxbhwlreepogy.supabase.co}")
    private String supabaseUrl;

    @Value("${app.supabase.anon-key:}")
    private String supabaseAnonKey;

    @Value("${app.supabase.storage.event-bucket:event-images}")
    private String eventBucket;

    @Value("${app.supabase.storage.profile-bucket:profile-images}")
    private String profileBucket;

    private final HttpClient httpClient;

    public SupabaseStorageService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    // Constructor for testing
    public SupabaseStorageService(HttpClient httpClient, String supabaseUrl, String supabaseAnonKey,
                                  String eventBucket, String profileBucket) {
        this.httpClient = httpClient;
        this.supabaseUrl = supabaseUrl;
        this.supabaseAnonKey = supabaseAnonKey;
        this.eventBucket = eventBucket;
        this.profileBucket = profileBucket;
    }

    @Override
    public String uploadEventImage(MultipartFile file) {
        return uploadImageToBucket(eventBucket, "event_", file);
    }

    @Override
    public String uploadProfileImage(MultipartFile file) {
        return uploadImageToBucket(profileBucket, "profile_", file);
    }

    private String uploadImageToBucket(String bucket, String prefix, MultipartFile file) {
        validateFile(file);

        String ext = extractExtension(file.getOriginalFilename());
        String filename = prefix + UUID.randomUUID() + ext;
        String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        try {
            byte[] bytes = file.getBytes();
            return uploadFile(bucket, filename, bytes, contentType);
        } catch (IOException e) {
            log.error("Failed to read uploaded file bytes: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to read image bytes. Please try again.");
        }
    }

    @Override
    public String uploadFile(String bucket, String filename, byte[] content, String contentType) {
        if (supabaseAnonKey != null && !supabaseAnonKey.isBlank() && supabaseUrl != null && !supabaseUrl.isBlank()) {
            return uploadToSupabase(bucket, filename, content, contentType);
        }

        log.warn("Supabase credentials not configured. Falling back to local filesystem storage.");
        return saveLocally(bucket, filename, content);
    }

    private String uploadToSupabase(String bucket, String filename, byte[] content, String contentType) {
        String baseUrl = supabaseUrl.replaceAll("/+$", "");
        URI uploadUri = URI.create(baseUrl + "/storage/v1/object/" + bucket + "/" + filename);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uploadUri)
                    .timeout(Duration.ofSeconds(20))
                    .header("apikey", supabaseAnonKey)
                    .header("Authorization", "Bearer " + supabaseAnonKey)
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .header("x-upsert", "true")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(content))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                String publicUrl = baseUrl + "/storage/v1/object/public/" + bucket + "/" + filename;
                log.info("Successfully uploaded image to Supabase Storage: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("Supabase Storage rejected upload (HTTP {}): {}", response.statusCode(), response.body());
                throw new IllegalStateException("Supabase Storage error: " + response.body());
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during Supabase upload: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to upload image to Supabase Storage: " + e.getMessage());
        }
    }

    private String saveLocally(String bucket, String filename, byte[] content) {
        try {
            Path targetDir = Paths.get("uploads", bucket).toAbsolutePath().normalize();
            Files.createDirectories(targetDir);
            Path filePath = targetDir.resolve(filename);
            Files.write(filePath, content);

            // Also copy to frontend static directory if exists
            Path feDir = Paths.get("Frontend/images/uploads").toAbsolutePath().normalize();
            if (Files.exists(feDir.getParent())) {
                Files.createDirectories(feDir);
                Files.write(feDir.resolve(filename), content);
            }

            return "/uploads/" + bucket + "/" + filename;
        } catch (IOException e) {
            log.error("Failed to save image locally: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to save image locally.");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (ALLOWED_EXTENSIONS.contains(ext)) {
                return ext;
            }
        }
        return ".jpg";
    }
}
