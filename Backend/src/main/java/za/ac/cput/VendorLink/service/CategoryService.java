package za.ac.cput.VendorLink.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.ac.cput.VendorLink.domain.Category;
import za.ac.cput.VendorLink.dto.request.CategoryRequest;
import za.ac.cput.VendorLink.dto.response.CategoryResponse;
import za.ac.cput.VendorLink.exception.ResourceNotFoundException;
import za.ac.cput.VendorLink.repository.CategoryRepository;
import za.ac.cput.VendorLink.util.Helper;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(Helper::toCategoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        return Helper.toCategoryResponse(category);
    }

    @Transactional
    public CategoryResponse createCategory(String name, String description, String iconUrl) {
        if (categoryRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        }

        Category category = Category.builder()
                .name(name.trim())
                .description(description)
                .iconUrl(iconUrl)
                .build();

        return Helper.toCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, String name, String description, String iconUrl) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));

        if (name != null && !name.isBlank()) {
            category.setName(name.trim());
        }
        if (description != null) {
            category.setDescription(description.trim());
        }
        if (iconUrl != null) {
            category.setIconUrl(iconUrl.trim());
        }

        return Helper.toCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category", id);
        }
        categoryRepository.deleteById(id);
    }
}
