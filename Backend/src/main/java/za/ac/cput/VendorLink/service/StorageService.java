package za.ac.cput.VendorLink.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String uploadEventImage(MultipartFile file);

    String uploadProfileImage(MultipartFile file);

    String uploadFile(String bucket, String filename, byte[] content, String contentType);
}
