export interface GraphNode {
    id: string;
    label: string;
    type: string;
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