package za.ac.cput.VendorLink.exception;

public class UnauthorizedAccessException extends RuntimeException {

    public UnauthorizedAccessException(String action, String resourceType) {
        super("You are not authorized to " + action + " this " + resourceType + ".");
    }
}
