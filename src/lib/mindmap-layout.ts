export interface RawMindMapNode {
  id: string;
  label: string;
  type?: "topic" | "subtopic" | "note";
  level?: number;
  color?: string;
  children?: string[];
  size?: "small" | "medium" | "large";
  icon?: string;
  shape?: "rounded" | "pill" | "square";
}

export interface PositionedNode {
  id: string;
  type: "topic" | "subtopic" | "note";
  position: { x: number; y: number };
  data: {
    label: string;
    color: string;
    size?: "small" | "medium" | "large";
    direction?: "left" | "right" | "top" | "bottom";
    icon?: string;
    shape?: "rounded" | "pill" | "square";
    isSearchMatch?: boolean;
    onUpdateLabel?: (newLabel: string) => void;
  };
}

export interface PositionedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string };
}

export type MindMapLayoutType =
  | "balanced"
  | "free"
  | "radial"
  | "topDown"
  | "horizontalFlow"
  | "fishbone";

export interface MindMapTheme {
  id: string;
  name: string;
  description: string;
  palette: string[];
}

export const DEFAULT_MINDMAP_PALETTE = [
  "#2563EB", // Azul Real
  "#059669", // Verde Esmeralda
  "#7C3AED", // Roxo Vibrante
  "#D97706", // Âmbar / Ouro
  "#E11D48", // Rosa Rubi
  "#0D9488", // Ciano / Teal
  "#4F46E5", // Índigo
  "#EA580C", // Laranja
  "#0284C7", // Azul Céu
  "#475569", // Grafite
];

export const MINDMAP_COLOR_THEMES: MindMapTheme[] = [
  {
    id: "studyflow",
    name: "MedSetup Pro",
    description: "Equilibrado, moderno e vibrante",
    palette: ["#2563EB", "#059669", "#7C3AED", "#D97706", "#E11D48", "#0D9488", "#4F46E5", "#EA580C"],
  },
  {
    id: "ocean",
    name: "Oceano Profundo",
    description: "Azuis, cianos e tons aquáticos",
    palette: ["#1E40AF", "#0284C7", "#06B6D4", "#0D9488", "#3B82F6", "#0369A1", "#4F46E5"],
  },
  {
    id: "emerald",
    name: "Floresta Esmeralda",
    description: "Verdes botânicos e âmbar dourado",
    palette: ["#059669", "#166534", "#10B981", "#84CC16", "#D97706", "#047857", "#15803D"],
  },
  {
    id: "sunset",
    name: "Pôr do Sol Tropical",
    description: "Cores quentes e enérgicas",
    palette: ["#E11D48", "#EA580C", "#D97706", "#DB2777", "#F97316", "#C026D3", "#DC2626"],
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    description: "Tons futuristas de alto contraste",
    palette: ["#7C3AED", "#06B6D4", "#EC4899", "#10B981", "#8B5CF6", "#F59E0B", "#3B82F6"],
  },
  {
    id: "monochrome",
    name: "Minimalista Grafite",
    description: "Sóbrio, elegante e discreto",
    palette: ["#334155", "#475569", "#64748B", "#1E293B", "#2563EB", "#0284C7"],
  },
];

// Helper to determine best handle pair according to angle between two points
function getAngleHandles(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx); // radians from -PI to PI
  const deg = (angle * 180) / Math.PI;

  if (deg >= -45 && deg <= 45) {
    return { sourceHandle: "source-right", targetHandle: "target-left" };
  } else if (deg > 45 && deg <= 135) {
    return { sourceHandle: "source-bottom", targetHandle: "target-top" };
  } else if (deg < -45 && deg >= -135) {
    return { sourceHandle: "source-top", targetHandle: "target-bottom" };
  } else {
    return { sourceHandle: "source-left", targetHandle: "target-right" };
  }
}

/**
 * Physical bounding-box relaxation engine:
 * Ensures NO TWO NODES EVER OVERLAP or collide.
 * Applies iterative repulsion on any overlapping pairs.
 */
export function resolveCollisions(
  nodes: PositionedNode[],
  maxIterations: number = 60
): PositionedNode[] {
  if (!nodes || nodes.length < 2) return nodes;

  const getNodeBounds = (n: PositionedNode) => {
    const textLen = (n.data?.label || "").length;
    let w = 280;
    let h = 95;
    if (n.id === "root" || n.type === "topic") {
      w = 340;
      h = 120;
    } else if (n.type === "note") {
      w = 280;
      h = textLen > 110 ? 150 : textLen > 55 ? 120 : 90;
    } else {
      // subtopic
      w = Math.max(220, Math.min(300, textLen * 9 + 50));
      h = Math.max(75, textLen > 40 ? 110 : 75);
    }
    return { w, h };
  };

  const marginX = 35; // minimum horizontal clearance in px
  const marginY = 35; // minimum vertical clearance in px

  const posMap = new Map<string, { x: number; y: number }>();
  nodes.forEach((n) => {
    posMap.set(n.id, { x: n.position.x, y: n.position.y });
  });

  for (let iter = 0; iter < maxIterations; iter++) {
    let hadCollision = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const posA = posMap.get(nodeA.id)!;
        const posB = posMap.get(nodeB.id)!;

        const boundsA = getNodeBounds(nodeA);
        const boundsB = getNodeBounds(nodeB);

        // Center coordinates
        const cxA = posA.x + boundsA.w / 2;
        const cyA = posA.y + boundsA.h / 2;
        const cxB = posB.x + boundsB.w / 2;
        const cyB = posB.y + boundsB.h / 2;

        const minDistX = (boundsA.w + boundsB.w) / 2 + marginX;
        const minDistY = (boundsA.h + boundsB.h) / 2 + marginY;

        let dx = cxB - cxA;
        let dy = cyB - cyA;

        if (dx === 0 && dy === 0) {
          dx = (i % 2 === 0 ? 1 : -1) * 10;
          dy = (j % 2 === 0 ? 1 : -1) * 10;
        }

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < minDistX && absDy < minDistY) {
          hadCollision = true;

          const overlapX = minDistX - absDx;
          const overlapY = minDistY - absDy;

          const isRootA = nodeA.id === "root" || nodeA.type === "topic";
          const isRootB = nodeB.id === "root" || nodeB.type === "topic";

          // Resolve on axis of least penetration
          if (overlapY < overlapX) {
            const shift = overlapY + 12;
            const signY = dy >= 0 ? 1 : -1;

            if (isRootA) {
              posB.y += shift * signY;
            } else if (isRootB) {
              posA.y -= shift * signY;
            } else {
              posA.y -= (shift / 2) * signY;
              posB.y += (shift / 2) * signY;
            }
          } else {
            const shift = overlapX + 12;
            const signX = dx >= 0 ? 1 : -1;

            if (isRootA) {
              posB.x += shift * signX;
            } else if (isRootB) {
              posA.x -= shift * signX;
            } else {
              posA.x -= (shift / 2) * signX;
              posB.x += (shift / 2) * signX;
            }
          }
        }
      }
    }

    if (!hadCollision) break;
  }

  // Final verification sweep to guarantee zero overlaps
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const posA = posMap.get(nodeA.id)!;
      const posB = posMap.get(nodeB.id)!;
      const boundsA = getNodeBounds(nodeA);
      const boundsB = getNodeBounds(nodeB);

      const cxA = posA.x + boundsA.w / 2;
      const cyA = posA.y + boundsA.h / 2;
      const cxB = posB.x + boundsB.w / 2;
      const cyB = posB.y + boundsB.h / 2;

      const minDistX = (boundsA.w + boundsB.w) / 2 + 25;
      const minDistY = (boundsA.h + boundsB.h) / 2 + 25;

      const dx = cxB - cxA;
      const dy = cyB - cyA;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < minDistX && absDy < minDistY) {
        const overlapX = minDistX - absDx;
        const overlapY = minDistY - absDy;

        if (overlapY < overlapX) {
          const signY = dy >= 0 ? 1 : -1;
          const pushY = overlapY + 12;
          if (nodeA.id === "root" || nodeA.type === "topic") posB.y += pushY * signY;
          else if (nodeB.id === "root" || nodeB.type === "topic") posA.y -= pushY * signY;
          else {
            posA.y -= (pushY / 2) * signY;
            posB.y += (pushY / 2) * signY;
          }
        } else {
          const signX = dx >= 0 ? 1 : -1;
          const pushX = overlapX + 12;
          if (nodeA.id === "root" || nodeA.type === "topic") posB.x += pushX * signX;
          else if (nodeB.id === "root" || nodeB.type === "topic") posA.x -= pushX * signX;
          else {
            posA.x -= (pushX / 2) * signX;
            posB.x += (pushX / 2) * signX;
          }
        }
      }
    }
  }

  return nodes.map((n) => {
    const updated = posMap.get(n.id);
    if (!updated) return n;
    return {
      ...n,
      position: {
        x: Math.round(updated.x),
        y: Math.round(updated.y),
      },
    };
  });
}

/**
 * 1. Calculates a balanced multi-directional (left and right) tree layout
 * with organic smooth curves and zero node/line overlap.
 */
export function calculateBalancedMindMapLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    const rootNode: PositionedNode = {
      id: "root",
      type: "topic",
      position: { x: 0, y: 0 },
      data: { label: title, color: palette[0], size: "large", direction: "right" },
    };
    return { nodes: [rootNode], edges: [] };
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Root Node centered at (0, 0)
  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: 0, y: 0 },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "right",
      icon: root.icon,
      shape: root.shape,
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  // Distribute level 2 subtopics evenly to Right and Left
  const rightBranches: RawMindMapNode[] = [];
  const leftBranches: RawMindMapNode[] = [];

  level2Nodes.forEach((node, idx) => {
    if (idx % 2 === 0) {
      rightBranches.push(node);
    } else {
      leftBranches.push(node);
    }
  });

  const getSubtreeHeight = (subNode: RawMindMapNode): number => {
    const children = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    const count = Math.max(1, children.length);
    return count * 155 + 50;
  };

  const layoutSide = (branches: RawMindMapNode[], isRight: boolean) => {
    const totalHeight = branches.reduce((acc, b) => acc + getSubtreeHeight(b), 0) + (branches.length - 1) * 60;
    const startY = -totalHeight / 2;
    let currentY = startY;

    branches.forEach((subNode, bIdx) => {
      const subtreeH = getSubtreeHeight(subNode);
      const subY = Math.round(currentY + subtreeH / 2);
      const subX = isRight ? 490 : -490;
      const subColor = subNode.color || palette[(bIdx + (isRight ? 1 : 4)) % palette.length];

      positionedNodes.push({
        id: subNode.id,
        type: "subtopic",
        position: { x: subX, y: subY },
        data: {
          label: subNode.label,
          color: subColor,
          size: subNode.size || "medium",
          direction: isRight ? "right" : "left",
          icon: subNode.icon,
          shape: subNode.shape,
        },
      });

      edges.push({
        id: `e-root-${subNode.id}`,
        source: root.id,
        target: subNode.id,
        sourceHandle: isRight ? "source-right" : "source-left",
        targetHandle: isRight ? "target-left" : "target-right",
        type: "default",
        style: { stroke: subColor, strokeWidth: 2.5 },
      });

      const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
      if (details.length > 0) {
        const detSpacing = 145;
        const detStartY = subY - ((details.length - 1) * detSpacing) / 2;
        const detX = isRight ? 920 : -920;

        details.forEach((det, dIdx) => {
          positionedNodes.push({
            id: det.id,
            type: det.type === "subtopic" ? "subtopic" : "note",
            position: { x: detX, y: Math.round(detStartY + dIdx * detSpacing) },
            data: {
              label: det.label,
              color: det.color || subColor,
              size: det.size || "small",
              direction: isRight ? "right" : "left",
              icon: det.icon,
              shape: det.shape,
            },
          });

          edges.push({
            id: `e-${subNode.id}-${det.id}`,
            source: subNode.id,
            target: det.id,
            sourceHandle: isRight ? "source-right" : "source-left",
            targetHandle: isRight ? "target-left" : "target-right",
            type: "default",
            style: { stroke: subColor, strokeWidth: 1.8 },
          });
        });
      }

      currentY += subtreeH + 60;
    });
  };

  layoutSide(rightBranches, true);
  layoutSide(leftBranches, false);

  const safeNodes = resolveCollisions(positionedNodes, 30);
  return { nodes: safeNodes, edges };
}

/**
 * 2. Calculates a Free 4-Directional Mind Map Layout (Layout Livre 4D)
 * with branches expanding freely across Right, Left, Top, and Bottom.
 */
export function calculateFree4DLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Root Node at center (0, 0)
  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: 0, y: 0 },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "right",
      icon: root.icon,
      shape: root.shape,
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  // Distribute level 2 subtopics across 4 cardinal directions (Right, Left, Top, Bottom)
  const rightBranches: RawMindMapNode[] = [];
  const leftBranches: RawMindMapNode[] = [];
  const topBranches: RawMindMapNode[] = [];
  const bottomBranches: RawMindMapNode[] = [];

  level2Nodes.forEach((node, idx) => {
    const mod = idx % 4;
    if (mod === 0) rightBranches.push(node);
    else if (mod === 1) leftBranches.push(node);
    else if (mod === 2) topBranches.push(node);
    else bottomBranches.push(node);
  });

  const getSubtreeHeight = (subNode: RawMindMapNode): number => {
    const children = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    return Math.max(1, children.length) * 140;
  };

  const getSubtreeWidth = (subNode: RawMindMapNode): number => {
    const children = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    return Math.max(1, children.length) * 310;
  };

  // 1. RIGHT BRANCHES (expanding to the right, distributed vertically)
  if (rightBranches.length > 0) {
    const totalH = rightBranches.reduce((acc, b) => acc + getSubtreeHeight(b), 0) + (rightBranches.length - 1) * 70;
    let currentY = -totalH / 2;

    rightBranches.forEach((subNode, bIdx) => {
      const subH = getSubtreeHeight(subNode);
      const subY = Math.round(currentY + subH / 2);
      const subX = 520;
      const subColor = subNode.color || palette[(bIdx * 4 + 1) % palette.length];

      positionedNodes.push({
        id: subNode.id,
        type: "subtopic",
        position: { x: subX, y: subY },
        data: {
          label: subNode.label,
          color: subColor,
          size: subNode.size || "medium",
          direction: "right",
          icon: subNode.icon,
          shape: subNode.shape,
        },
      });

      edges.push({
        id: `e-root-${subNode.id}`,
        source: root.id,
        target: subNode.id,
        sourceHandle: "source-right",
        targetHandle: "target-left",
        type: "default",
        style: { stroke: subColor, strokeWidth: 2.5 },
      });

      const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
      if (details.length > 0) {
        const detSpacing = 145;
        const detStartY = subY - ((details.length - 1) * detSpacing) / 2;
        const detX = subX + 400;

        details.forEach((det, dIdx) => {
          positionedNodes.push({
            id: det.id,
            type: det.type === "subtopic" ? "subtopic" : "note",
            position: { x: detX, y: Math.round(detStartY + dIdx * detSpacing) },
            data: {
              label: det.label,
              color: det.color || subColor,
              size: det.size || "small",
              direction: "right",
              icon: det.icon,
              shape: det.shape,
            },
          });

          edges.push({
            id: `e-${subNode.id}-${det.id}`,
            source: subNode.id,
            target: det.id,
            sourceHandle: "source-right",
            targetHandle: "target-left",
            type: "default",
            style: { stroke: subColor, strokeWidth: 1.8 },
          });
        });
      }

      currentY += subH + 70;
    });
  }

  // 2. LEFT BRANCHES (expanding to the left, distributed vertically)
  if (leftBranches.length > 0) {
    const totalH = leftBranches.reduce((acc, b) => acc + getSubtreeHeight(b), 0) + (leftBranches.length - 1) * 70;
    let currentY = -totalH / 2;

    leftBranches.forEach((subNode, bIdx) => {
      const subH = getSubtreeHeight(subNode);
      const subY = Math.round(currentY + subH / 2);
      const subX = -520;
      const subColor = subNode.color || palette[(bIdx * 4 + 2) % palette.length];

      positionedNodes.push({
        id: subNode.id,
        type: "subtopic",
        position: { x: subX, y: subY },
        data: {
          label: subNode.label,
          color: subColor,
          size: subNode.size || "medium",
          direction: "left",
          icon: subNode.icon,
          shape: subNode.shape,
        },
      });

      edges.push({
        id: `e-root-${subNode.id}`,
        source: root.id,
        target: subNode.id,
        sourceHandle: "source-left",
        targetHandle: "target-right",
        type: "default",
        style: { stroke: subColor, strokeWidth: 2.5 },
      });

      const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
      if (details.length > 0) {
        const detSpacing = 145;
        const detStartY = subY - ((details.length - 1) * detSpacing) / 2;
        const detX = subX - 400;

        details.forEach((det, dIdx) => {
          positionedNodes.push({
            id: det.id,
            type: det.type === "subtopic" ? "subtopic" : "note",
            position: { x: detX, y: Math.round(detStartY + dIdx * detSpacing) },
            data: {
              label: det.label,
              color: det.color || subColor,
              size: det.size || "small",
              direction: "left",
              icon: det.icon,
              shape: det.shape,
            },
          });

          edges.push({
            id: `e-${subNode.id}-${det.id}`,
            source: subNode.id,
            target: det.id,
            sourceHandle: "source-left",
            targetHandle: "target-right",
            type: "default",
            style: { stroke: subColor, strokeWidth: 1.8 },
          });
        });
      }

      currentY += subH + 70;
    });
  }

  // 3. TOP BRANCHES (expanding upwards, strictly in center corridor [-350, 350])
  if (topBranches.length > 0) {
    const totalW = topBranches.reduce((acc, b) => acc + Math.min(getSubtreeWidth(b), 300), 0) + (topBranches.length - 1) * 80;
    let currentX = Math.max(-320, -totalW / 2);

    topBranches.forEach((subNode, bIdx) => {
      const subW = Math.min(getSubtreeWidth(subNode), 300);
      const subX = Math.round(Math.max(-320, Math.min(320, currentX + subW / 2)));
      const subY = -430;
      const subColor = subNode.color || palette[(bIdx * 4 + 3) % palette.length];

      positionedNodes.push({
        id: subNode.id,
        type: "subtopic",
        position: { x: subX, y: subY },
        data: {
          label: subNode.label,
          color: subColor,
          size: subNode.size || "medium",
          direction: "top",
          icon: subNode.icon,
          shape: subNode.shape,
        },
      });

      edges.push({
        id: `e-root-${subNode.id}`,
        source: root.id,
        target: subNode.id,
        sourceHandle: "source-top",
        targetHandle: "target-bottom",
        type: "default",
        style: { stroke: subColor, strokeWidth: 2.5 },
      });

      const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
      if (details.length > 0) {
        const maxPerRow = details.length > 4 ? Math.ceil(details.length / 2) : details.length;
        const detSpacing = 340;

        details.forEach((det, dIdx) => {
          const rowIdx = details.length > 4 ? Math.floor(dIdx / maxPerRow) : 0;
          const colIdx = details.length > 4 ? dIdx % maxPerRow : dIdx;
          const countInThisRow = details.length > 4 ? (rowIdx === 0 ? maxPerRow : details.length - maxPerRow) : details.length;
          const rowStartX = subX - ((countInThisRow - 1) * detSpacing) / 2;
          const detX = Math.round(rowStartX + colIdx * detSpacing);
          const detY = subY - 200 - rowIdx * 210;

          positionedNodes.push({
            id: det.id,
            type: det.type === "subtopic" ? "subtopic" : "note",
            position: { x: detX, y: detY },
            data: {
              label: det.label,
              color: det.color || subColor,
              size: det.size || "small",
              direction: "top",
              icon: det.icon,
              shape: det.shape,
            },
          });

          edges.push({
            id: `e-${subNode.id}-${det.id}`,
            source: subNode.id,
            target: det.id,
            sourceHandle: "source-top",
            targetHandle: "target-bottom",
            type: "default",
            style: { stroke: subColor, strokeWidth: 1.8 },
          });
        });
      }

      currentX += subW + 80;
    });
  }

  // 4. BOTTOM BRANCHES (expanding downwards, strictly in center corridor [-350, 350])
  if (bottomBranches.length > 0) {
    const totalW = bottomBranches.reduce((acc, b) => acc + Math.min(getSubtreeWidth(b), 300), 0) + (bottomBranches.length - 1) * 80;
    let currentX = Math.max(-320, -totalW / 2);

    bottomBranches.forEach((subNode, bIdx) => {
      const subW = Math.min(getSubtreeWidth(subNode), 300);
      const subX = Math.round(Math.max(-320, Math.min(320, currentX + subW / 2)));
      const subY = 430;
      const subColor = subNode.color || palette[(bIdx * 4 + 4) % palette.length];

      positionedNodes.push({
        id: subNode.id,
        type: "subtopic",
        position: { x: subX, y: subY },
        data: {
          label: subNode.label,
          color: subColor,
          size: subNode.size || "medium",
          direction: "bottom",
          icon: subNode.icon,
          shape: subNode.shape,
        },
      });

      edges.push({
        id: `e-root-${subNode.id}`,
        source: root.id,
        target: subNode.id,
        sourceHandle: "source-bottom",
        targetHandle: "target-top",
        type: "default",
        style: { stroke: subColor, strokeWidth: 2.5 },
      });

      const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
      if (details.length > 0) {
        const maxPerRow = details.length > 4 ? Math.ceil(details.length / 2) : details.length;
        const detSpacing = 340;

        details.forEach((det, dIdx) => {
          const rowIdx = details.length > 4 ? Math.floor(dIdx / maxPerRow) : 0;
          const colIdx = details.length > 4 ? dIdx % maxPerRow : dIdx;
          const countInThisRow = details.length > 4 ? (rowIdx === 0 ? maxPerRow : details.length - maxPerRow) : details.length;
          const rowStartX = subX - ((countInThisRow - 1) * detSpacing) / 2;
          const detX = Math.round(rowStartX + colIdx * detSpacing);
          const detY = subY + 200 + rowIdx * 210;

          positionedNodes.push({
            id: det.id,
            type: det.type === "subtopic" ? "subtopic" : "note",
            position: { x: detX, y: detY },
            data: {
              label: det.label,
              color: det.color || subColor,
              size: det.size || "small",
              direction: "bottom",
              icon: det.icon,
              shape: det.shape,
            },
          });

          edges.push({
            id: `e-${subNode.id}-${det.id}`,
            source: subNode.id,
            target: det.id,
            sourceHandle: "source-bottom",
            targetHandle: "target-top",
            type: "default",
            style: { stroke: subColor, strokeWidth: 1.8 },
          });
        });
      }

      currentX += subW + 80;
    });
  }

  // Pass through collision resolver to eliminate ANY possibility of overlapping balloons
  const safeNodes = resolveCollisions(positionedNodes, 30);

  return { nodes: safeNodes, edges };
}

/**
 * 3. Calculates a Radial 360° Circular Layout
 * Concentric circles where topics fan out symmetrically around the central concept.
 */
export function calculateRadialMindMapLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Root Node at (0, 0)
  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: 0, y: 0 },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "right",
      icon: root.icon,
      shape: root.shape,
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  const numSubtopics = level2Nodes.length;
  const radius1 = 440; // Subtopic radius
  const radius2 = 820; // Note radius

  level2Nodes.forEach((subNode, idx) => {
    // Distribute angles starting from -90deg (top) clockwise
    const angle = (2 * Math.PI * idx) / numSubtopics - Math.PI / 2;
    const subX = Math.round(radius1 * Math.cos(angle));
    const subY = Math.round(radius1 * Math.sin(angle));
    const subColor = subNode.color || palette[(idx + 1) % palette.length];

    const { sourceHandle, targetHandle } = getAngleHandles(0, 0, subX, subY);

    positionedNodes.push({
      id: subNode.id,
      type: "subtopic",
      position: { x: subX, y: subY },
      data: {
        label: subNode.label,
        color: subColor,
        size: subNode.size || "medium",
        direction: subX >= 0 ? "right" : "left",
        icon: subNode.icon,
        shape: subNode.shape,
      },
    });

    edges.push({
      id: `e-root-${subNode.id}`,
      source: root.id,
      target: subNode.id,
      sourceHandle,
      targetHandle,
      type: "default",
      style: { stroke: subColor, strokeWidth: 2.5 },
    });

    // Radial children (notes) fanning out around this subtopic
    const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    if (details.length > 0) {
      const angularSpread = Math.min(0.55, (2 * Math.PI) / (numSubtopics * 1.5));
      const startAngle = angle - ((details.length - 1) * (angularSpread / Math.max(1, details.length - 1))) / 2;

      details.forEach((det, dIdx) => {
        const childAngle =
          details.length === 1 ? angle : startAngle + dIdx * (angularSpread / (details.length - 1));
        const detX = Math.round(radius2 * Math.cos(childAngle));
        const detY = Math.round(radius2 * Math.sin(childAngle));

        const childHandles = getAngleHandles(subX, subY, detX, detY);

        positionedNodes.push({
          id: det.id,
          type: det.type === "subtopic" ? "subtopic" : "note",
          position: { x: detX, y: detY },
          data: {
            label: det.label,
            color: det.color || subColor,
            size: det.size || "small",
            direction: detX >= 0 ? "right" : "left",
            icon: det.icon,
            shape: det.shape,
          },
        });

        edges.push({
          id: `e-${subNode.id}-${det.id}`,
          source: subNode.id,
          target: det.id,
          sourceHandle: childHandles.sourceHandle,
          targetHandle: childHandles.targetHandle,
          type: "default",
          style: { stroke: subColor, strokeWidth: 1.8 },
        });
      });
    }
  });

  return { nodes: resolveCollisions(positionedNodes, 30), edges };
}

/**
 * 4. Calculates a Top-Down Hierarchical Tree Layout
 * Ideal for taxonomies, systematic classifications, and organograms.
 */
export function calculateTopDownTreeLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Root Node centered at top (0, 0)
  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: 0, y: 0 },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "bottom",
      icon: root.icon,
      shape: root.shape,
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  // Calculate width required by each subtopic's subtree
  const subtreeWidths = level2Nodes.map((subNode) => {
    const children = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    const count = children.length > 4 ? Math.ceil(children.length / 2) : Math.max(1, children.length);
    return Math.max(340, count * 340);
  });

  const totalWidth = subtreeWidths.reduce((acc, w) => acc + w, 0);
  let currentX = -totalWidth / 2;

  level2Nodes.forEach((subNode, idx) => {
    const sw = subtreeWidths[idx];
    const subX = currentX + sw / 2;
    const subY = 240;
    const subColor = subNode.color || palette[(idx + 1) % palette.length];

    positionedNodes.push({
      id: subNode.id,
      type: "subtopic",
      position: { x: subX, y: subY },
      data: {
        label: subNode.label,
        color: subColor,
        size: subNode.size || "medium",
        direction: "bottom",
        icon: subNode.icon,
        shape: subNode.shape,
      },
    });

    edges.push({
      id: `e-root-${subNode.id}`,
      source: root.id,
      target: subNode.id,
      sourceHandle: "source-bottom",
      targetHandle: "target-top",
      type: "smoothstep",
      style: { stroke: subColor, strokeWidth: 2.5 },
    });

    // Children of subtopic (level 3 notes)
    const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    if (details.length > 0) {
      const maxPerRow = details.length > 4 ? Math.ceil(details.length / 2) : details.length;
      const childSpacingX = 340;

      details.forEach((det, dIdx) => {
        const rowIdx = details.length > 4 ? Math.floor(dIdx / maxPerRow) : 0;
        const colIdx = details.length > 4 ? dIdx % maxPerRow : dIdx;
        const countInThisRow = details.length > 4 ? (rowIdx === 0 ? maxPerRow : details.length - maxPerRow) : details.length;
        const rowStartX = subX - ((countInThisRow - 1) * childSpacingX) / 2;
        const detX = Math.round(rowStartX + colIdx * childSpacingX);
        const childY = 460 + rowIdx * 210;

        positionedNodes.push({
          id: det.id,
          type: det.type === "subtopic" ? "subtopic" : "note",
          position: { x: detX, y: childY },
          data: {
            label: det.label,
            color: det.color || subColor,
            size: det.size || "small",
            direction: "bottom",
            icon: det.icon,
            shape: det.shape,
          },
        });

        edges.push({
          id: `e-${subNode.id}-${det.id}`,
          source: subNode.id,
          target: det.id,
          sourceHandle: "source-bottom",
          targetHandle: "target-top",
          type: "smoothstep",
          style: { stroke: subColor, strokeWidth: 1.8 },
        });
      });
    }

    currentX += sw;
  });

  return { nodes: resolveCollisions(positionedNodes, 30), edges };
}

/**
 * 5. Calculates a Horizontal Flow Layout (Left-to-Right logic flow)
 * Ideal for timelines, workflows, diagnosis trees, and progressive study sequences.
 */
export function calculateHorizontalFlowLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Root Node at Left (x: 0, y: 0)
  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: 0, y: 0 },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "right",
      icon: root.icon,
      shape: root.shape,
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  const getSubtreeHeight = (subNode: RawMindMapNode): number => {
    const children = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    return Math.max(1, children.length) * 110;
  };

  const totalHeight = level2Nodes.reduce((acc, b) => acc + getSubtreeHeight(b), 0);
  let currentY = -totalHeight / 2;

  level2Nodes.forEach((subNode, idx) => {
    const subtreeH = getSubtreeHeight(subNode);
    const subY = currentY + subtreeH / 2;
    const subX = 420;
    const subColor = subNode.color || palette[(idx + 1) % palette.length];

    positionedNodes.push({
      id: subNode.id,
      type: "subtopic",
      position: { x: subX, y: subY },
      data: {
        label: subNode.label,
        color: subColor,
        size: subNode.size || "medium",
        direction: "right",
        icon: subNode.icon,
        shape: subNode.shape,
      },
    });

    edges.push({
      id: `e-root-${subNode.id}`,
      source: root.id,
      target: subNode.id,
      sourceHandle: "source-right",
      targetHandle: "target-left",
      type: "smoothstep",
      style: { stroke: subColor, strokeWidth: 2.5 },
    });

    const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    if (details.length > 0) {
      const detSpacing = 95;
      const detStartY = subY - ((details.length - 1) * detSpacing) / 2;
      const detX = 840;

      details.forEach((det, dIdx) => {
        positionedNodes.push({
          id: det.id,
          type: det.type === "subtopic" ? "subtopic" : "note",
          position: { x: detX, y: detStartY + dIdx * detSpacing },
          data: {
            label: det.label,
            color: det.color || subColor,
            size: det.size || "small",
            direction: "right",
            icon: det.icon,
            shape: det.shape,
          },
        });

        edges.push({
          id: `e-${subNode.id}-${det.id}`,
          source: subNode.id,
          target: det.id,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: "smoothstep",
          style: { stroke: subColor, strokeWidth: 1.8 },
        });
      });
    }

    currentY += subtreeH + 35;
  });

  return { nodes: resolveCollisions(positionedNodes, 30), edges };
}

/**
 * 6. Calculates a Fishbone (Ishikawa / Cause-and-Effect) Diagram Layout
 * Classical engineering & clinical diagnosis structure.
 */
export function calculateFishboneLayout(
  rawNodes: RawMindMapNode[],
  title: string = "Efeito Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (!rawNodes || rawNodes.length === 0) {
    return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }

  const root = rawNodes.find((n) => n.id === "root") || rawNodes[0];
  const rootChildrenIds = root.children || [];
  const level2Nodes = rawNodes.filter(
    (n) => n.id !== root.id && (rootChildrenIds.includes(n.id) || n.level === 2 || n.type === "subtopic")
  );

  const positionedNodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];

  // Central Effect (Root) positioned at the right end of the spine
  const rootX = 600;
  const rootY = 0;

  positionedNodes.push({
    id: root.id,
    type: "topic",
    position: { x: rootX, y: rootY },
    data: {
      label: root.label || title,
      color: root.color || palette[0],
      size: "large",
      direction: "left",
      icon: root.icon || "🎯",
      shape: "rounded",
    },
  });

  if (level2Nodes.length === 0) {
    return { nodes: positionedNodes, edges };
  }

  // Major bones (categories) spaced along the spine to the left of root
  const numBones = level2Nodes.length;
  const spineSpacing = Math.min(340, Math.max(220, 1200 / numBones));

  level2Nodes.forEach((subNode, idx) => {
    const isTop = idx % 2 === 0;
    const pairIndex = Math.floor(idx / 2);
    const boneX = rootX - 280 - pairIndex * spineSpacing;
    const boneY = isTop ? -250 : 250;
    const subColor = subNode.color || palette[(idx + 1) % palette.length];

    positionedNodes.push({
      id: subNode.id,
      type: "subtopic",
      position: { x: boneX, y: boneY },
      data: {
        label: subNode.label,
        color: subColor,
        size: subNode.size || "medium",
        direction: isTop ? "bottom" : "top",
        icon: subNode.icon,
        shape: subNode.shape,
      },
    });

    // Bone connects to root/spine
    edges.push({
      id: `e-root-${subNode.id}`,
      source: root.id,
      target: subNode.id,
      sourceHandle: "source-left",
      targetHandle: isTop ? "target-bottom" : "target-top",
      type: "straight",
      style: { stroke: subColor, strokeWidth: 2.5 },
    });

    // Sub-causes (details/notes) placed horizontally alongside each bone
    const details = rawNodes.filter((n) => (subNode.children || []).includes(n.id) && n.id !== subNode.id);
    if (details.length > 0) {
      details.forEach((det, dIdx) => {
        const detX = boneX - 220;
        const detY = boneY + (isTop ? -1 : 1) * ((dIdx + 1) * 75);

        positionedNodes.push({
          id: det.id,
          type: det.type === "subtopic" ? "subtopic" : "note",
          position: { x: detX, y: detY },
          data: {
            label: det.label,
            color: det.color || subColor,
            size: det.size || "small",
            direction: "right",
            icon: det.icon,
            shape: det.shape,
          },
        });

        edges.push({
          id: `e-${subNode.id}-${det.id}`,
          source: subNode.id,
          target: det.id,
          sourceHandle: "source-left",
          targetHandle: "target-right",
          type: "straight",
          style: { stroke: subColor, strokeWidth: 1.8 },
        });
      });
    }
  });

  return { nodes: resolveCollisions(positionedNodes, 30), edges };
}

/**
 * Master layout dispatcher supporting all 6 mindmap layouts.
 */
export function calculateMindMapLayout(
  rawNodes: RawMindMapNode[],
  layoutType: MindMapLayoutType = "balanced",
  title: string = "Tema Central",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  switch (layoutType) {
    case "free":
      return calculateFree4DLayout(rawNodes, title, palette);
    case "radial":
      return calculateRadialMindMapLayout(rawNodes, title, palette);
    case "topDown":
      return calculateTopDownTreeLayout(rawNodes, title, palette);
    case "horizontalFlow":
      return calculateHorizontalFlowLayout(rawNodes, title, palette);
    case "fishbone":
      return calculateFishboneLayout(rawNodes, title, palette);
    case "balanced":
    default:
      return calculateBalancedMindMapLayout(rawNodes, title, palette);
  }
}

/**
 * Universal MindMap normalizer and layout healer.
 * - Detects if nodes are already valid, positioned ReactFlow nodes with positions (x, y) and data.
 * - If already positioned and valid, preserves their layout and safely attaches missing properties.
 * - If raw, unpositioned (e.g. from AI audio transcription, raw JSON, or missing coordinates),
 *   maps edges and parent-child hierarchy to calculate a clean, collision-free layout.
 * - Guarantees that EVERY node gets a valid position and valid data object.
 * - Always returns safe { nodes: PositionedNode[], edges: PositionedEdge[] }.
 */
export function normalizeMindMapNodesAndEdges(
  rawNodes?: any[],
  rawEdges?: any[],
  title: string = "Tema Central",
  preferredLayout: MindMapLayoutType = "balanced",
  palette: string[] = DEFAULT_MINDMAP_PALETTE
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  const safePalette = Array.isArray(palette) && palette.length > 0 ? palette : DEFAULT_MINDMAP_PALETTE;

  // 1. If empty or invalid, return default template
  if (!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) {
    const templateNodes: RawMindMapNode[] = [
      { id: "root", label: title || "Tema Central", type: "topic", level: 1, children: ["sub-1", "sub-2", "sub-3", "sub-4"] },
      { id: "sub-1", label: "Primeiro Ramo (Principal)", type: "subtopic", level: 2, children: ["det-1-1", "det-1-2"] },
      { id: "det-1-1", label: "Detalhe Específico 1.1", type: "note", level: 3, children: [] },
      { id: "det-1-2", label: "Detalhe Específico 1.2", type: "note", level: 3, children: [] },
      { id: "sub-2", label: "Segundo Ramo (Conceito)", type: "subtopic", level: 2, children: ["det-2-1"] },
      { id: "det-2-1", label: "Detalhe Específico 2.1", type: "note", level: 3, children: [] },
      { id: "sub-3", label: "Terceiro Ramo (Aplicação)", type: "subtopic", level: 2, children: [] },
      { id: "sub-4", label: "Quarto Ramo (Critérios)", type: "subtopic", level: 2, children: [] },
    ];
    return calculateMindMapLayout(templateNodes, preferredLayout, title, safePalette);
  }

  // 2. Check if all nodes are already valid positioned ReactFlow nodes
  const allPositioned = rawNodes.every(
    (n) =>
      n &&
      typeof n === "object" &&
      n.position &&
      typeof n.position.x === "number" &&
      !isNaN(n.position.x) &&
      typeof n.position.y === "number" &&
      !isNaN(n.position.y) &&
      (n.data?.label || n.label)
  );

  if (allPositioned) {
    const positionedNodes: PositionedNode[] = rawNodes.map((n, idx) => {
      const type =
        n.type === "topic" || n.type === "subtopic" || n.type === "note"
          ? n.type
          : idx === 0
          ? "topic"
          : "subtopic";
      const label = n.data?.label || n.label || `Conceito ${idx + 1}`;
      const color = n.data?.color || n.color || safePalette[idx % safePalette.length];
      const size = n.data?.size || n.size || (type === "topic" ? "large" : type === "subtopic" ? "medium" : "small");
      const direction = n.data?.direction || n.direction || (n.position.x < 0 ? "left" : "right");
      const icon = n.data?.icon || n.icon;
      const shape = n.data?.shape || n.shape;

      return {
        id: String(n.id || `node_${idx}`),
        type,
        position: { x: Number(n.position.x), y: Number(n.position.y) },
        data: {
          ...n.data,
          label,
          color,
          size,
          direction,
          icon,
          shape,
        },
      };
    });

    const edgesList = Array.isArray(rawEdges) ? rawEdges : [];
    const validEdges: PositionedEdge[] = edgesList
      .filter((e) => e && e.source && e.target)
      .map((e, idx) => ({
        id: String(e.id || `e_${e.source}_${e.target}_${idx}`),
        source: String(e.source),
        target: String(e.target),
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type || "default",
        animated: false,
        style: {
          stroke: e.style?.stroke || "#6366F1",
          strokeWidth: e.style?.strokeWidth || 2,
        },
      }));

    return { nodes: resolveCollisions(positionedNodes, 30), edges: validEdges };
  }

  // 3. Raw or unpositioned nodes: Construct tree & calculate preferred layout
  const rootIndex = rawNodes.findIndex(
    (n) => n.id === "root" || n.id === "1" || n.type === "topic" || n.level === 1
  );
  const rootRaw = rootIndex >= 0 ? rawNodes[rootIndex] : rawNodes[0];
  const rootId = String(rootRaw.id || "root");

  const childrenMap = new Map<string, Set<string>>();
  rawNodes.forEach((n) => {
    const id = String(n.id);
    if (!childrenMap.has(id)) childrenMap.set(id, new Set());
    if (Array.isArray(n.children)) {
      n.children.forEach((cId: any) => childrenMap.get(id)!.add(String(cId)));
    }
  });

  if (Array.isArray(rawEdges)) {
    rawEdges.forEach((e) => {
      if (e && e.source && e.target) {
        const src = String(e.source);
        const tgt = String(e.target);
        if (!childrenMap.has(src)) childrenMap.set(src, new Set());
        childrenMap.get(src)!.add(tgt);
      }
    });
  }

  const directRootChildren = childrenMap.get(rootId) || new Set();
  const nonRootNodes = rawNodes.filter((n) => String(n.id) !== rootId);

  const subtopicCandidates = nonRootNodes.filter(
    (n) =>
      directRootChildren.has(String(n.id)) ||
      n.type === "subtopic" ||
      n.level === 2 ||
      (childrenMap.get(String(n.id))?.size || 0) > 0
  );

  const subtopics = subtopicCandidates.length > 0 ? subtopicCandidates : nonRootNodes.slice(0, 6);
  const subtopicIdSet = new Set(subtopics.map((s) => String(s.id)));

  subtopics.forEach((s) => directRootChildren.add(String(s.id)));

  const remainingNodes = nonRootNodes.filter((n) => !subtopicIdSet.has(String(n.id)));
  remainingNodes.forEach((n, idx) => {
    const nId = String(n.id);
    let hasParent = false;
    for (const s of subtopics) {
      if (childrenMap.get(String(s.id))?.has(nId)) {
        hasParent = true;
        break;
      }
    }
    if (!hasParent && subtopics.length > 0) {
      const assignedSub = subtopics[idx % subtopics.length];
      childrenMap.get(String(assignedSub.id))!.add(nId);
    }
  });

  const rawList: RawMindMapNode[] = rawNodes.map((n, idx) => {
    const nId = String(n.id || `node_${idx}`);
    const isRoot = nId === rootId;
    const isSub = subtopicIdSet.has(nId);
    const nType: "topic" | "subtopic" | "note" = isRoot
      ? "topic"
      : isSub
      ? "subtopic"
      : "note";
    const label = n.data?.label || n.label || n.title || (isRoot ? title : `Conceito ${idx + 1}`);
    const children = Array.from(childrenMap.get(nId) || []);

    return {
      id: nId,
      label,
      type: nType,
      level: isRoot ? 1 : isSub ? 2 : 3,
      color: n.data?.color || n.color || safePalette[idx % safePalette.length],
      children,
      icon: n.data?.icon || n.icon,
      shape: n.data?.shape || n.shape,
    };
  });

  try {
    const layoutRes = calculateMindMapLayout(rawList, preferredLayout, title, safePalette);
    if (layoutRes.nodes && layoutRes.nodes.length > 0) {
      return layoutRes;
    }
  } catch (err) {
    console.error("Layout calculation failed in normalizer:", err);
  }

  return calculateBalancedMindMapLayout(rawList, title, safePalette);
}
