import type { Bbox } from "@/types/sentinel";
import { CDSE_PROCESS_URL } from "./endpoints";
import { TRUE_COLOR_LEAST_CC_EVALSCRIPT } from "./evalscript";

export interface ProcessParams {
  bbox: Bbox;
  from: string;
  to: string;
  width: number;
  height: number;
  accessToken: string;
  evalscript?: string;
}

export async function fetchFrame(params: ProcessParams): Promise<Blob> {
  const { bbox, from, to, width, height, accessToken, evalscript } = params;

  const body = {
    input: {
      bounds: {
        bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from, to },
            mosaickingOrder: "leastCC",
          },
        },
      ],
    },
    output: {
      width,
      height,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript: evalscript ?? TRUE_COLOR_LEAST_CC_EVALSCRIPT,
  };

  const res = await fetch(CDSE_PROCESS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "image/png",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Process API failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.blob();
}
