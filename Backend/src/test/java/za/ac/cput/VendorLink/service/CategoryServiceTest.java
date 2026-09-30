package za.ac.cput.VendorLink.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import za.ac.cput.VendorLink.domain.Category;
import za.ac.cput.VendorLink.dto.response.CategoryResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.repository.CategoryRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Category category;

    @BeforeEach
    void setUp() {
        category = Category.builder()
                .id(1L)
                .name("Food & Beverages")
                .description("Artisan coffee, food trucks, street food.")
                .iconUrl("utensils")
                .build();
    }

    @Test
    @DisplayName("getAllCategories: should return all categories mapped to DTOs")
    void getAllCategories_shouldReturnAllCategories() {
        when(categoryRepository.findAll()).thenReturn(List.of(category));

        List<CategoryResponse> result = categoryService.getAllCategories();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Food & Beverages");
        verify(categoryRepository).findAll();
    }

    @Test
    @DisplayName("getCategoryById: should return category when found")
    void getCategoryById_shouldReturnCategory() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        CategoryResponse result = categoryService.getCategoryById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Food & Beverages");
        verify(categoryRepository).findById(1L);
    }

    @Test
    @DisplayName("getCategoryById: should throw ResourceNotFoundException when not found")
    void getCategoryById_shouldThrowWhenNotFound() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.getCategoryById(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("createCategory: should create and save new category")
    void createCategory_shouldCreateCategory() {
        when(categoryRepository.existsByNameIgnoreCase("Crafts")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> {
            Category c = i.getArgument(0);
            c.setId(2L);
            return c;
        });

        CategoryResponse response = categoryService.createCategory("Crafts", "Handmade items", "palette");

        assertThat(response.getId()).isEqualTo(2L);
        assertThat(response.getName()).isEqualTo("Crafts");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("createCategory: should throw IllegalArgumentException when duplicate name")
    void createCategory_shouldThrowWhenDuplicateName() {
        when(categoryRepository.existsByNameIgnoreCase("Food & Beverages")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.createCategory("Food & Beverages", "Desc", "icon"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteCategory: should delete category by ID")
    void deleteCategory_shouldDeleteById() {
        when(categoryRepository.existsById(1L)).thenReturn(true);

        categoryService.deleteCategory(1L);

        verify(categoryRepository).deleteById(1L);
    }

    @Test
    @DisplayName("deleteCategory: should throw ResourceNotFoundException when category not found")
    void deleteCategory_shouldThrowWhenNotFound() {
        when(categoryRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> categoryService.deleteCategory(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(categoryRepository, never()).deleteById(anyLong());
    }
}
