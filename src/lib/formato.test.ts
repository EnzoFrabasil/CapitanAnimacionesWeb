import { describe, expect, it } from "vitest";
import { formatearDiaCorto, formatearFecha, formatearWhatsapp } from "./formato";

describe("formato", () => {
  it("formatea fechas para mostrar", () => {
    expect(formatearDiaCorto("2027-01-04")).toBe("lun 4/1");
    expect(formatearDiaCorto("2027-01-13")).toBe("mié 13/1");
    expect(formatearFecha("2027-01-04")).toBe("04/01/2027");
  });

  it("formatea el WhatsApp normalizado", () => {
    expect(formatearWhatsapp("+5491123456789")).toBe("+54 9 11 2345 6789");
  });
});
