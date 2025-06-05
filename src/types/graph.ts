import { GraphNodeKind } from './graphNodeKind';

export interface GraphNode {
    id: string;
    label: string;
    type: GraphNodeKind;
    contractName: string;
    parameters?: string[];
    functionType?: string;
    isTrait?: boolean;
    traitName?: string;
}

export type ContractNode = GraphNode;

export interface GraphEdge {
    from: string;
    to: string;
    label: string;
}

export interface ContractGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
} 
