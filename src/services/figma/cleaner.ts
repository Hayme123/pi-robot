import { Json, Node } from "./types.js";

const REMOVE_KEYS = new Set(["id", "key", "pluginData", "sharedPluginData", "exportSettings", "componentId", "componentSetId", "documentationLinks", "relativeTransform", "absoluteRenderBounds", "interactions", "reactions", "transitionNodeID", "overlayPositionType", "overlayBackground", "prototypeStartNodeID", "scrollBehavior", "blendMode", "boundVariables", "styles", "styleOverrideTable", "characterStyleOverrides", "lineTypes", "lineIndentations", "layoutVersion", "complexStrokeProperties", "overrides", "annotations", "transitionDuration", "transitionEasing", "componentProperties", "componentPropertyReferences", "componentPropertyDefinitions", "exposedInstances", "isExposedInstance", "targetAspectRatio", "cornerSmoothing"]);
const WRAPPER_TYPES = new Set(["GROUP", "FRAME", "SECTION"]);
const DESIGN_KEYS = [
  "name", "type", "characters", "absoluteBoundingBox", "fills", "strokes", "strokeWeight",
  "individualStrokeWeights", "background", "backgroundColor", "opacity", "effects", "rotation",
  "clipsContent", "strokeAlign", "cornerRadius", "rectangleCornerRadii", "style", "constraints",
  "layoutMode", "layoutWrap", "itemSpacing", "counterAxisSpacing", "primaryAxisAlignItems",
  "counterAxisAlignItems", "primaryAxisSizingMode", "counterAxisSizingMode", "paddingLeft", "paddingRight",
  "paddingTop", "paddingBottom", "layoutSizingHorizontal", "layoutSizingVertical", "layoutAlign", "layoutGrow",
  "layoutPositioning", "minWidth", "maxWidth", "minHeight", "maxHeight", "overflowDirection", "isMask",
  "isMaskOutline", "maskType", "arcData",
] as const;
type Bounds = [number, number, number | undefined, number | undefined];

/**
 * Removes hidden, off-canvas, wrapper, and noisy properties from Figma JSON.
 *
 * @param {Node} node - Figma root node to clean.
 * @returns {Json} Cleaned Figma JSON.
 *
 * @example
 * const cleaned = cleanFigmaNode(frame);
 */
export function cleanFigmaNode(node: Node): Json {
  return cleanNode(node, getFrameBounds(node), true) as Json;
}

/** Creates a validated, flat design specification from a cleaned Figma tree. */
export function createFigmaDesignSpec(node: Node): Json {
  const nodes: Record<string, Json>[] = [];
  let childCount = 0;
  let textNodeCount = 0;
  let boundingBoxCount = 0;

  const visit = (current: Node, path: string): void => {
    if (current.visible === false) return;
    const entry: Record<string, Json> = { path };
    for (const key of DESIGN_KEYS) {
      const value = current[key];
      if (value !== undefined && value !== null && (!Array.isArray(value) || value.length)) entry[key] = value as Json;
    }
    if (typeof current.characters === "string" && current.characters.trim()) textNodeCount += 1;
    if (current.absoluteBoundingBox && typeof current.absoluteBoundingBox === "object") boundingBoxCount += 1;
    nodes.push(entry);

    const children = Array.isArray(current.children) ? current.children : [];
    for (const [index, child] of children.entries()) {
      if (!child || typeof child !== "object" || Array.isArray(child) || (child as Node).visible === false) continue;
      childCount += 1;
      visit(child as Node, `${path}.${index}`);
    }
  };

  visit(node, "0");
  if (!childCount) throw new Error("Figma design spec has no visible child nodes");
  if (!textNodeCount) throw new Error("Figma design spec has no visible text nodes");
  if (!boundingBoxCount) throw new Error("Figma design spec has no bounding boxes");
  return { nodeCount: nodes.length, textNodeCount, boundingBoxCount, nodes };
}

function cleanNode(value: unknown, bounds: Bounds, isRoot = false): Json | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value as Json;
  const node = value as Node;
  if (node.visible === false || (!isRoot && isOffCanvas(node, bounds))) return undefined;

  const cleaned: Record<string, Json> = {};
  for (const [key, child] of Object.entries(node)) {
    if (REMOVE_KEYS.has(key)) continue;
    if (key === "children" && Array.isArray(child)) {
      const children = child.map((item) => cleanNode(item, bounds)).filter((item): item is Json => item !== undefined);
      if (children.length) cleaned.children = children;
      continue;
    }
    const result = cleanNode(child, bounds);
    if (result !== undefined) cleaned[key] = result;
  }
  return isEmptyWrapper(cleaned) ? undefined : cleaned;
}

function getFrameBounds(node: Node): Bounds {
  const box = node.absoluteBoundingBox as Node | undefined;
  return [Number(box?.x ?? 0), Number(box?.y ?? 0), numberOrUndefined(box?.width), numberOrUndefined(box?.height)];
}

function isOffCanvas(node: Node, [frameX, frameY, frameWidth, frameHeight]: Bounds): boolean {
  const box = node.absoluteBoundingBox as Node | undefined;
  if (!box || frameWidth === undefined || frameHeight === undefined) return false;
  const [x, y, width, height] = [Number(box.x ?? 0), Number(box.y ?? 0), Number(box.width ?? 0), Number(box.height ?? 0)];
  return x + width < frameX - 2000 || y + height < frameY - 2000 || x > frameX + frameWidth + 2000 || y > frameY + frameHeight + 2000;
}

function isEmptyWrapper(node: Record<string, Json>): boolean {
  return WRAPPER_TYPES.has(String(node.type)) && !node.children && !["fills", "strokes", "characters", "absoluteBoundingBox"].some((key) => key in node);
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
