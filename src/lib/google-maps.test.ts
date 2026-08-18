import { describe, expect, it } from "vitest";
import { formatGeocoderAddress, formatPlaceAddress } from "./google-maps";

function result(
  formatted: string,
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
): google.maps.GeocoderResult {
  return {
    formatted_address: formatted,
    address_components: components,
    geometry: {} as google.maps.GeocoderResult["geometry"],
    place_id: "test",
    types: ["locality"],
  };
}

describe("formatGeocoderAddress", () => {
  it("keeps city and province and drops Canada", () => {
    expect(
      formatGeocoderAddress(
        result("Calgary, AB, Canada", [
          { long_name: "Calgary", short_name: "Calgary", types: ["locality"] },
          {
            long_name: "Alberta",
            short_name: "AB",
            types: ["administrative_area_level_1"],
          },
        ]),
      ),
    ).toBe("Calgary, AB");
  });

  it("falls back to city and region when formatted_address is empty", () => {
    expect(
      formatGeocoderAddress(
        result("", [
          { long_name: "Edmonton", short_name: "Edmonton", types: ["locality"] },
          {
            long_name: "Alberta",
            short_name: "AB",
            types: ["administrative_area_level_1"],
          },
        ]),
      ),
    ).toBe("Edmonton, AB");
  });
});

describe("formatPlaceAddress", () => {
  it("strips Canada from formattedAddress", () => {
    expect(
      formatPlaceAddress({ formattedAddress: "Calgary, AB, Canada" }),
    ).toBe("Calgary, AB");
  });

  it("falls back to displayName string", () => {
    expect(formatPlaceAddress({ displayName: "Fort McMurray" })).toBe(
      "Fort McMurray",
    );
  });

  it("falls back to displayName.text", () => {
    expect(
      formatPlaceAddress({ displayName: { text: "Red Deer" } }),
    ).toBe("Red Deer");
  });
});
