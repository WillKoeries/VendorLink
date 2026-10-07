package za.ac.cput.VendorLink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import za.ac.cput.VendorLink.dto.response.CategoryResponse;
import za.ac.cput.VendorLink.security.CustomUserDetails;
import za.ac.cput.VendorLink.service.CategoryService;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CategoryService categoryService;

    private final CustomUserDetails organizerUser = new CustomUserDetails(
            1L, "organizer@vendorlink.co.za", "Password123!", "ORGANIZER"
    );

    @Test
    @DisplayName("Should list all seeded categories publicly")
    void shouldListCategories() throws Exception {
        List<CategoryResponse> mockCategories = List.of(
                CategoryResponse.builder().id(1L).name("Food & Drinks").description("Artisanal foods").iconUrl("utensils").build(),
                CategoryResponse.builder().id(2L).name("Handmade Crafts").description("Pottery").iconUrl("palette").build(),
                CategoryResponse.builder().id(3L).name("Fashion & Apparel").description("Clothing").iconUrl("shirt").build(),
                CategoryResponse.builder().id(4L).name("Art & Photography").description("Prints").iconUrl("camera").build(),
                CategoryResponse.builder().id(5L).name("Health & Wellness").description("Skincare").iconUrl("spa").build()
        );

        when(categoryService.getAllCategories()).thenReturn(mockCategories);

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].name").value("Food & Drinks"));

        verify(categoryService).getAllCategories();
    }

    @Test
    @DisplayName("Should allow organizer to create a new category")
    void shouldCreateCategoryAsOrganizer() throws Exception {
        Map<String, String> newCategory = Map.of(
                "name", "Vintage & Collectibles",
                "description", "Antiques, retro games, vinyl records and rare books.",
                "iconUrl", "sparkle"
        );

        CategoryResponse createdResponse = CategoryResponse.builder()
                .id(10L)
                .name("Vintage & Collectibles")
                .description("Antiques, retro games, vinyl records and rare books.")
                .iconUrl("sparkle")
                .build();

        when(categoryService.createCategory("Vintage & Collectibles", "Antiques, retro games, vinyl records and rare books.", "sparkle"))
                .thenReturn(createdResponse);

        mockMvc.perform(post("/api/categories")
                        .with(user(organizerUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Vintage & Collectibles"));

        verify(categoryService).createCategory("Vintage & Collectibles", "Antiques, retro games, vinyl records and rare books.", "sparkle");
    }
}
