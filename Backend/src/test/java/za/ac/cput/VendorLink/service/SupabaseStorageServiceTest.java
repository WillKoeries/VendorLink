package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class SupabaseStorageServiceTest {

    private SupabaseStorageService storageService;

    @BeforeEach
    void setUp() {
        // Without Supabase credentials to test validation and local fallback
        storageService = new SupabaseStorageService(null, "https://ahyhdieaxbhwlreepogy.supabase.co", "", "event-images", "profile-images");
    }

    @Test
    @DisplayName("Should reject empty file")
    void shouldRejectEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[0]);
        assertThatThrownBy(() -> storageService.uploadEventImage(emptyFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    @DisplayName("Should reject non-image file")
    void shouldRejectNonImageFile() {
        MockMultipartFile textFile = new MockMultipartFile("file", "document.pdf", "application/pdf", "some data".getBytes());
        assertThatThrownBy(() -> storageService.uploadEventImage(textFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only image files are allowed");
    }

    @Test
    @DisplayName("Should reject file exceeding 5MB")
    void shouldRejectOversizedFile() {
        byte[] largeBytes = new byte[6 * 1024 * 1024];
        MockMultipartFile largeFile = new MockMultipartFile("file", "huge.jpg", "image/jpeg", largeBytes);
        assertThatThrownBy(() -> storageService.uploadEventImage(largeFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds 5MB limit");
    }

    @Test
    @DisplayName("Should fallback to local storage when Supabase key is unconfigured")
    void shouldFallbackToLocalStorage() {
        MockMultipartFile validFile = new MockMultipartFile("file", "photo.png", "image/png", "sample data".getBytes());
        String url = storageService.uploadEventImage(validFile);

        assertThat(url).isNotNull();
        assertThat(url).startsWith("/uploads/event-images/event_");
        assertThat(url).endsWith(".png");
    }
}
