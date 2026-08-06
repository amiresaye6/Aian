"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGraphVisualization } from '@/hooks/graph/useGraphVisualization';
import { useNodeNeighbors } from '@/hooks/graph/useNodeNeighbors';
import { GraphNode, GraphLink, GraphResponse } from '@/shared/types/graph';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityDetailsSheet } from '../EntityDetailsSheet';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dynamic import with SSR disabled
const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full min-h-[500px] rounded-xl bg-white/[0.02]" />
});

export function EntitiesGraph() {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  // Local merged state for the graph (initial + expanded nodes)
  const [mergedData, setMergedData] = useState<GraphResponse | null>(null);
  
  // Filters state
  const [limit, setLimit] = useState(150);
  const [minDegree, setMinDegree] = useState(0);

  // Fetch initial top-degree graph
  const { data: initialData, isLoading: isInitialLoading } = useGraphVisualization({ limit, minDegree });
  
  // Fetch neighbors when a node is expanded
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const { data: neighborsData, isFetching: isFetchingNeighbors } = useNodeNeighbors(expandingNodeId);

  // Sync initial data into local state
  useEffect(() => {
    if (initialData) {
      setMergedData(initialData);
    }
  }, [initialData]);

  // Merge newly fetched neighbors into local state
  useEffect(() => {
    if (neighborsData && mergedData) {
      setMergedData(prev => {
        if (!prev) return prev;
        
        // Merge nodes (prevent duplicates)
        const nodeMap = new Map(prev.nodes.map(n => [n.id, n]));
        neighborsData.nodes.forEach(n => nodeMap.set(n.id, n));
        
        // Merge links (prevent duplicates)
        const linkSet = new Set(prev.links.map(l => `${l.source}-${l.target}-${l.type}`));
        const newLinks = [...prev.links];
        neighborsData.links.forEach(l => {
          const key = `${l.source}-${l.target}-${l.type}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            newLinks.push(l);
          }
        });

        return {
          nodes: Array.from(nodeMap.values()),
          links: newLinks,
          meta: prev.meta
        };
      });
      // Reset expansion trigger
      setExpandingNodeId(null);
    }
  }, [neighborsData]);

  // Handle ResizeObserver for responsive canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.unobserve(el);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    // 1. Open details sheet
    setSelectedEntityId(node.id);
    // 2. Expand neighbors silently
    setExpandingNodeId(node.id);
  }, []);
  
  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[500px] relative rounded-xl" ref={containerRef}>
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex gap-4 bg-background/90 p-2 rounded-lg backdrop-blur-md border shadow-sm">
        <div className="flex items-center gap-2 text-foreground">
           <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Limit:</label>
           <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
             <SelectTrigger className="h-8 w-[100px] bg-white/[0.02] border-white/5 focus:ring-0 focus:ring-offset-0">
               <SelectValue placeholder="Select limit" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="50">50</SelectItem>
               <SelectItem value="150">150</SelectItem>
               <SelectItem value="300">300</SelectItem>
               <SelectItem value="500">500</SelectItem>
               <SelectItem value="1000">1000</SelectItem>
             </SelectContent>
           </Select>
        </div>
        <div className="flex items-center gap-2 text-foreground border-l border-white/10 pl-4">
           <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Min Degree:</label>
           <Select value={minDegree.toString()} onValueChange={(val) => setMinDegree(Number(val))}>
             <SelectTrigger className="h-8 w-[100px] bg-white/[0.02] border-white/5 focus:ring-0 focus:ring-offset-0">
               <SelectValue placeholder="Select degree" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="0">0</SelectItem>
               <SelectItem value="1">1</SelectItem>
               <SelectItem value="2">2</SelectItem>
               <SelectItem value="5">5</SelectItem>
               <SelectItem value="10">10</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      {isInitialLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-sm rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      {containerSize.width > 0 && mergedData && (
        <GraphCanvas 
          data={mergedData} 
          onNodeClick={handleNodeClick}
          width={containerSize.width}
          height={containerSize.height}
        />
      )}
      
      <EntityDetailsSheet 
        entityId={selectedEntityId} 
        onClose={() => setSelectedEntityId(null)} 
      />
    </div>
  );
}
