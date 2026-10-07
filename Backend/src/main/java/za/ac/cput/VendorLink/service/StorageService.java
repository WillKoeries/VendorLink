package za.ac.cput.VendorLink.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    /**
     * Upload an event banner/flyer image to storage and return its public CDN URL.
     *
     * @param file the uploaded image
     * @return the accessible public URL
     */
    String uploadEventImage(MultipartFile file);

    /**
     * Upload a vendor profile avatar/logo image to storage and return its public CDN URL.
     *
     * @param file the uploaded image
     * @return the accessible public URL
     */
    String uploadProfileImage(MultipartFile file);

    /**
     * Low-level upload of raw bytes to a target bucket.
     *
     * @param bucket      the storage bucket name
     * @param filename    the destination file name
     * @param content     the file payload bytes
     * @param contentType MIME type (e.g. image/jpeg)
     * @return the accessible public URL
     */
    String uploadFile(String bucket, String filename, byte[] content, String contentType);
}
