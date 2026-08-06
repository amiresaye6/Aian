"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphNode, GraphLink, GraphResponse } from '@/shared/types/graph';
import { useGraphTheme } from './useGraphTheme';

interface GraphCanvasProps {
  data: GraphResponse | null;
  onNodeClick: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

export default function GraphCanvas({ data, onNodeClick, width = 800, height = 600 }: GraphCanvasProps) {
  const fgRef = useRef<any>(null);
  const theme = useGraphTheme();
  
  // Memoize graph data to avoid simulation restart on every render
  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    
    // Create new object references to avoid mutating the original data which messes up react state
    return {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.links.map(l => ({ ...l }))
    };
  }, [data]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || 'Unknown';
    const fontSize = 12 / globalScale;
    const nodeR = Math.max(4, Math.min(12, 4 + (node.degree || 1) * 0.5));
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI, false);
    ctx.fillStyle = theme.nodeColors[node.type?.toUpperCase()] || theme.nodeColors.DEFAULT;
    ctx.fill();

    // Draw label only if zoomed in enough (performance optimization)
    if (globalScale >= 1.5) {
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.labelColor;
      ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    }
  }, [theme]);

  // Initial zoom to fit when data loads
  useEffect(() => {
    if (graphData.nodes.length > 0 && fgRef.current) {
      // Small timeout to allow physics to settle slightly
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 20);
        }
      }, 300);
    }
  }, [graphData]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full text-muted-foreground bg-black/5 rounded-xl border border-white/5">
        No relationships found for this view.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-white/[0.01] border border-white/5 shadow-2xl relative">
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={graphData}
        nodeLabel="label"
        nodeId="id"
        nodeCanvasObject={paintNode}
        nodeRelSize={4}
        linkColor={() => theme.linkColor}
        linkWidth={1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node: any) => onNodeClick(node as GraphNode)}
        cooldownTicks={100}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.2}
      />
      {data.meta.truncated && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs px-4 py-2 rounded-full shadow-lg">
          Showing top {data.nodes.length} of {data.meta.totalNodeCount} nodes.
        </div>
      )}
    </div>
  );
}
