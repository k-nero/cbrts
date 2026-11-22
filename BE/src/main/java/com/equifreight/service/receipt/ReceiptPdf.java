package com.equifreight.service.receipt;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

/**
 * Draws a payment receipt as a one-page A4 PDF in the app's light theme: an ink header band with the brand in gold, the
 * amount on a card, the facts in two columns and the balance in a box. It uses the PDF's built-in Times, Helvetica and
 * Courier (standing in for Fraunces, Outfit and DM Mono), which cover only Western European letters, so every text is
 * printed without accents ("Vũ Hải Yến" as "Vu Hai Yen").
 */
public final class ReceiptPdf {

    /**
     * What the receipt says. Money values are already formatted with their currency ("USD 1,002.00").
     *
     * @param status the word on the chip beside the title ("Paid in full")
     * @param settled whether the invoice is paid in full: the chip and the last balance line are then green
     * @param highlights the facts beside the amount (when and how it was paid)
     * @param rows the facts under the amount, label then value, in order, in two columns
     * @param balance the invoice's balance after this payment; the last line is the one that matters
     */
    public record Receipt(
            String title,
            String issuedOn,
            String status,
            boolean settled,
            String amountCaption,
            String amount,
            List<Row> highlights,
            List<Row> rows,
            List<Row> balance,
            String footer) {}

    /** A labelled fact; {@code mono} prints the value as a code (a reference, an id). */
    public record Row(String label, String value, boolean mono) {
        public Row(String label, String value) {
            this(label, value, false);
        }
    }

    // Light theme tokens (FE/src/index.css).
    private static final int INK = 0x0f1a28;
    private static final int INK_2 = 0x3c4a5b;
    private static final int INK_3 = 0x5a6a7d;
    private static final int ON_INK = 0xb3bfcc;
    private static final int ON_INK_3 = 0x7a8fa3;
    private static final int RAISED = 0xf3f5f8;
    private static final int LINE = 0xdde3ea;
    private static final int GOLD = 0xc9aa5a;
    private static final int GOLD_INK = 0x80611a;
    private static final int OK = 0x1d7a47;
    private static final int OK_SOFT = 0xe2f3e9;
    private static final int OK_LINE = 0xa9d8bb;
    private static final int INFO = 0x1f5fa8;
    private static final int INFO_SOFT = 0xe4eefa;
    private static final int INFO_LINE = 0xb3cdef;

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final float MARGIN = 48;
    private static final float BAND = 116;
    private static final float GUTTER = 28;

    private final PDType1Font serif = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
    private final PDType1Font sans = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private final PDType1Font sansBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private final PDType1Font mono = new PDType1Font(Standard14Fonts.FontName.COURIER);
    private final PDType1Font monoBold = new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);

    public byte[] render(Receipt receipt) {
        try (PDDocument doc = new PDDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDDocumentInformation info = doc.getDocumentInformation();
            info.setTitle(plain(receipt.title()));
            info.setAuthor("EquiFreight");
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            float width = page.getMediaBox().getWidth();
            float height = page.getMediaBox().getHeight();
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = header(cs, receipt, width, height);
                y = title(cs, receipt, width, y);
                y = amount(cs, receipt, width, y);
                y = details(cs, receipt.rows(), width, y);
                balance(cs, receipt, width, y);
                footer(cs, receipt.footer(), width);
            }
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("The receipt couldn't be drawn", e);
        }
    }

    /** The ink band across the top, the brand in gold on it and a gold rule under it. */
    private float header(PDPageContentStream cs, Receipt receipt, float width, float height) throws IOException {
        float bottom = height - BAND;
        rect(cs, 0, bottom, width, BAND, INK);
        rect(cs, 0, bottom - 3, width, 3, GOLD);
        text(cs, sansBold, 15, MARGIN, height - 56, "EQUIFREIGHT", GOLD, 2f);
        text(cs, sans, 9, MARGIN, height - 74, "Racehorse transport by road and air", ON_INK_3, 0.3f);
        rightText(cs, sansBold, 7.5f, width - MARGIN, height - 56, "RECEIPT", ON_INK_3, 0.9f);
        rightText(cs, sans, 10, width - MARGIN, height - 74, receipt.issuedOn(), ON_INK, 0);
        return bottom - 3;
    }

    /** The serif title, the status chip on its right and a line of thanks under it. */
    private float title(PDPageContentStream cs, Receipt receipt, float width, float top) throws IOException {
        float base = top - 54;
        text(cs, serif, 28, MARGIN, base, receipt.title(), INK, 0);
        chip(cs, receipt.status(), receipt.settled(), width - MARGIN, base + 2);
        text(cs, sans, 10.5f, MARGIN, base - 22, "Thank you for your payment.", INK_3, 0);
        return base - 40;
    }

    private void chip(PDPageContentStream cs, String label, boolean settled, float right, float base)
            throws IOException {
        String s = plain(label).toUpperCase(Locale.ROOT);
        float size = 8;
        float spacing = 0.9f;
        float w = width(sansBold, size, s, spacing) + 22;
        float h = 20;
        float x = right - w;
        roundRect(cs, x, base - 6, w, h, h / 2, settled ? OK_SOFT : INFO_SOFT, settled ? OK_LINE : INFO_LINE);
        text(cs, sansBold, size, x + 11, base, s, settled ? OK : INFO, spacing);
    }

    /** The amount on a raised card with a gold accent, when and how it was paid on its right. */
    private float amount(PDPageContentStream cs, Receipt receipt, float width, float top) throws IOException {
        float h = 96;
        float bottom = top - h;
        roundRect(cs, MARGIN, bottom, width - 2 * MARGIN, h, 10, RAISED, null);
        roundRect(cs, MARGIN + 14, bottom + 18, 3, h - 36, 1.5f, GOLD, null);
        float x = MARGIN + 34;
        label(cs, x, top - 30, receipt.amountCaption());
        text(cs, monoBold, 30, x, top - 68, receipt.amount(), INK, 0);

        float col = width - MARGIN - 190;
        float y = top - 30;
        for (Row row : receipt.highlights()) {
            label(cs, col, y, row.label());
            text(cs, row.mono() ? mono : sans, 10.5f, col, y - 15, row.value(), INK, 0);
            y -= 34;
        }
        return bottom;
    }

    /** The facts in two columns, each label in small capitals over its value. */
    private float details(PDPageContentStream cs, List<Row> rows, float width, float top) throws IOException {
        float y = section(cs, "Details", width, top - 34);
        float colWidth = (width - 2 * MARGIN - GUTTER) / 2;
        for (int i = 0; i < rows.size(); i += 2) {
            float tallest = 0;
            for (int c = 0; c < 2 && i + c < rows.size(); c++) {
                Row row = rows.get(i + c);
                float x = MARGIN + c * (colWidth + GUTTER);
                label(cs, x, y, row.label());
                PDType1Font font = row.mono() ? mono : sans;
                float size = row.mono() ? 9.5f : 10.5f;
                float line = y - 15;
                for (String part : wrap(font, row.value(), size, colWidth)) {
                    text(cs, font, size, x, line, part, INK, 0);
                    line -= 13;
                }
                tallest = Math.max(tallest, y - line);
            }
            y -= tallest + 16;
        }
        return y;
    }

    /** The balance after this payment in a box, its last line bold (green when nothing is left). */
    private void balance(PDPageContentStream cs, Receipt receipt, float width, float top) throws IOException {
        float y = section(cs, "Balance", width, top - 14);
        List<Row> rows = receipt.balance();
        float rowHeight = 26;
        float h = rows.size() * rowHeight + 12;
        float bottom = y + 14 - h;
        roundRect(cs, MARGIN, bottom, width - 2 * MARGIN, h, 8, 0xffffff, LINE);
        float line = y + 14 - 23;
        for (int i = 0; i < rows.size(); i++) {
            Row row = rows.get(i);
            boolean last = i == rows.size() - 1;
            if (last && i > 0) hairline(cs, MARGIN + 18, width - MARGIN - 18, line + 15);
            int tone = last && receipt.settled() ? OK : INK;
            text(cs, last ? sansBold : sans, 10.5f, MARGIN + 18, line, row.label(), last ? INK : INK_2, 0);
            rightText(
                    cs,
                    row.mono() ? (last ? monoBold : mono) : (last ? sansBold : sans),
                    10.5f,
                    width - MARGIN - 18,
                    line,
                    row.value(),
                    tone,
                    0);
            line -= rowHeight;
        }
    }

    private void footer(PDPageContentStream cs, String footer, float width) throws IOException {
        List<String> lines = wrap(sans, footer, 8.5f, width - 2 * MARGIN);
        float y = MARGIN + 12 * (lines.size() - 1);
        hairline(cs, MARGIN, width - MARGIN, y + 20);
        rect(cs, MARGIN, y + 19, 28, 2, GOLD);
        for (String line : lines) {
            text(cs, sans, 8.5f, MARGIN, y, line, INK_3, 0);
            y -= 12;
        }
    }

    /** A small-capitals section name in gold ink with a rule under it; returns where its first line goes. */
    private float section(PDPageContentStream cs, String name, float width, float y) throws IOException {
        text(cs, sansBold, 8, MARGIN, y, plain(name).toUpperCase(Locale.ROOT), GOLD_INK, 0.9f);
        hairline(cs, MARGIN, width - MARGIN, y - 9);
        return y - 30;
    }

    private void label(PDPageContentStream cs, float x, float y, String s) throws IOException {
        text(cs, sansBold, 7, x, y, plain(s).toUpperCase(Locale.ROOT), INK_3, 0.9f);
    }

    private static void rect(PDPageContentStream cs, float x, float y, float w, float h, int fill) throws IOException {
        color(cs, fill, false);
        cs.addRect(x, y, w, h);
        cs.fill();
    }

    private static void hairline(PDPageContentStream cs, float from, float to, float y) throws IOException {
        color(cs, LINE, true);
        cs.setLineWidth(0.75f);
        cs.moveTo(from, y);
        cs.lineTo(to, y);
        cs.stroke();
    }

    /** A rectangle with rounded corners, filled, and outlined when {@code stroke} is given. */
    private static void roundRect(
            PDPageContentStream cs, float x, float y, float w, float h, float r, int fill, Integer stroke)
            throws IOException {
        float k = r * 0.5523f; // Bézier handle length for a quarter circle
        cs.moveTo(x + r, y);
        cs.lineTo(x + w - r, y);
        cs.curveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
        cs.lineTo(x + w, y + h - r);
        cs.curveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
        cs.lineTo(x + r, y + h);
        cs.curveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
        cs.lineTo(x, y + r);
        cs.curveTo(x, y + r - k, x + r - k, y, x + r, y);
        cs.closePath();
        color(cs, fill, false);
        if (stroke == null) {
            cs.fill();
        } else {
            color(cs, stroke, true);
            cs.setLineWidth(0.75f);
            cs.fillAndStroke();
        }
    }

    private static void color(PDPageContentStream cs, int rgb, boolean stroking) throws IOException {
        float r = (rgb >> 16 & 0xff) / 255f;
        float g = (rgb >> 8 & 0xff) / 255f;
        float b = (rgb & 0xff) / 255f;
        if (stroking) cs.setStrokingColor(r, g, b);
        else cs.setNonStrokingColor(r, g, b);
    }

    private static void text(
            PDPageContentStream cs, PDType1Font font, float size, float x, float y, String s, int rgb, float spacing)
            throws IOException {
        cs.beginText();
        color(cs, rgb, false);
        cs.setFont(font, size);
        cs.setCharacterSpacing(spacing);
        cs.newLineAtOffset(x, y);
        cs.showText(plain(s));
        cs.endText();
    }

    private static void rightText(
            PDPageContentStream cs,
            PDType1Font font,
            float size,
            float right,
            float y,
            String s,
            int rgb,
            float spacing)
            throws IOException {
        text(cs, font, size, right - width(font, size, plain(s), spacing), y, s, rgb, spacing);
    }

    private static float width(PDType1Font font, float size, String s, float spacing) throws IOException {
        return font.getStringWidth(s) / 1000 * size + spacing * Math.max(0, s.length() - 1);
    }

    private static List<String> wrap(PDType1Font font, String s, float size, float max) throws IOException {
        List<String> lines = new ArrayList<>();
        StringBuilder line = new StringBuilder();
        for (String word : plain(s).split(" ")) {
            String next = line.isEmpty() ? word : line + " " + word;
            if (!line.isEmpty() && width(font, size, next, 0) > max) {
                lines.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(next);
            }
        }
        if (!line.isEmpty()) lines.add(line.toString());
        return lines;
    }

    /**
     * The text without accents, in what Helvetica can print: "Vũ Hải Yến" becomes "Vu Hai Yen", "Đ" becomes "D", and any
     * other letter it lacks becomes "?".
     */
    static String plain(String s) {
        if (s == null) return "";
        String folded = MARKS.matcher(Normalizer.normalize(s, Normalizer.Form.NFD))
                .replaceAll("")
                .replace('Đ', 'D')
                .replace('đ', 'd')
                .replace('–', '-')
                .replace('—', '-')
                .replace('’', '\'');
        StringBuilder out = new StringBuilder(folded.length());
        folded.codePoints().forEach(c -> out.append(c >= 0x20 && c < 0x7f || c == 0xb7 ? (char) c : '?'));
        return out.toString();
    }
}
