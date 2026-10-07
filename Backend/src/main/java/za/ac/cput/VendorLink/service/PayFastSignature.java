package za.ac.cput.VendorLink.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

public final class PayFastSignature {
    private PayFastSignature() {}

    public static String sign(LinkedHashMap<String, String> fields, String passphrase) {
        StringBuilder value = new StringBuilder();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            value.append(entry.getKey()).append('=')
                    .append(phpUrlEncode(entry.getValue().trim())).append('&');
        }
        appendPassphrase(value, passphrase);
        return md5(value.toString());
    }

    public static String signNotification(LinkedHashMap<String, String> fields, String passphrase) {
        StringBuilder value = new StringBuilder();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            if ("signature".equals(entry.getKey())) break;
            value.append(entry.getKey()).append('=')
                    .append(phpUrlEncode(entry.getValue() == null ? "" : entry.getValue())).append('&');
        }
        appendPassphrase(value, passphrase);
        return md5(value.toString());
    }

    static String phpUrlEncode(String input) {
        StringBuilder output = new StringBuilder(input.length() * 2);
        for (byte raw : input.getBytes(StandardCharsets.UTF_8)) {
            int c = raw & 0xff;
            boolean safe = c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z'
                    || c >= '0' && c <= '9' || c == '-' || c == '_' || c == '.';
            if (safe) output.append((char) c);
            else if (c == ' ') output.append('+');
            else output.append('%').append(HexFormat.of().withUpperCase().toHexDigits((byte) c));
        }
        return output.toString();
    }

    private static void appendPassphrase(StringBuilder value, String passphrase) {
        if (passphrase != null && !passphrase.isBlank()) {
            value.append("passphrase=").append(phpUrlEncode(passphrase.trim()));
        } else if (!value.isEmpty()) {
            value.setLength(value.length() - 1);
        }
    }

    private static String md5(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("MD5")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 is unavailable", e);
        }
    }
}
