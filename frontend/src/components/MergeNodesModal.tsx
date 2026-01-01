import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { useWorkflowStore } from '../stores/workflowStore';
import { WorkflowNode, Port } from '../types/workflow';
import { nanoid } from 'nanoid';

interface MergeNodesModalProps {
  selectedNodeIds: string[];
  onClose: () => void;
  onMerged: () => void;
}

export const MergeNodesModal: React.FC<MergeNodesModalProps> = ({
  selectedNodeIds,
  onClose,
  onMerged,
}) => {
  const { workflow, removeNode, addEdge, removeEdge } = useWorkflowStore();
  
  const [name, setName] = useState('子流程');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');

  // 获取选中的节点
  const selectedNodes = useMemo(() => {
    if (!workflow) return [];
    return workflow.nodes.filter(n => selectedNodeIds.includes(n.id));
  }, [workflow, selectedNodeIds]);

  // 分析输入输出
  const { externalInputs, externalOutputs, internalEdges } = useMemo(() => {
    if (!workflow) return { externalInputs: [], externalOutputs: [], internalEdges: [] };

    const nodeIdSet = new Set(selectedNodeIds);
    const inputs: Array<{ port: Port; fromEdge: typeof workflow.edges[0]; nodeLabel: string }> = [];
    const outputs: Array<{ port: Port; toEdge: typeof workflow.edges[0]; nodeLabel: string }> = [];
    const internal: typeof workflow.edges = [];

    workflow.edges.forEach(edge => {
      const sourceInGroup = nodeIdSet.has(edge.source);
      const targetInGroup = nodeIdSet.has(edge.target);

      if (sourceInGroup && targetInGroup) {
        // 内部连线
        internal.push(edge);
      } else if (!sourceInGroup && targetInGroup) {
        // 外部输入
        const targetNode = workflow.nodes.find(n => n.id === edge.target);
        const port = targetNode?.data.inputs?.find(p => p.id === edge.targetHandle);
        if (port && targetNode) {
          inputs.push({ port, fromEdge: edge, nodeLabel: targetNode.data.label });
        }
      } else if (sourceInGroup && !targetInGroup) {
        // 外部输出
        const sourceNode = workflow.nodes.find(n => n.id === edge.source);
        const port = sourceNode?.data.outputs?.find(p => p.id === edge.sourceHandle);
        if (port && sourceNode) {
          outputs.push({ port, toEdge: edge, nodeLabel: sourceNode.data.label });
        }
      }
    });

    return { externalInputs: inputs, externalOutputs: outputs, internalEdges: internal };
  }, [workflow, selectedNodeIds]);

  // 计算合并后节点的位置（选中节点的中心）
  const mergedPosition = useMemo(() => {
    if (selectedNodes.length === 0) return { x: 0, y: 0 };
    
    const sumX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0);
    const sumY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0);
    
    return {
      x: sumX / selectedNodes.length,
      y: sumY / selectedNodes.length,
    };
  }, [selectedNodes]);

  const handleMerge = () => {
    if (!workflow || selectedNodes.length < 2) return;

    // 创建合并后的输入输出端口
    const mergedInputs: Port[] = externalInputs.map((input, index) => ({
      id: `input_${index}`,
      name: `${input.nodeLabel} - ${input.port.name}`,
      data_type: input.port.data_type,
    }));

    const mergedOutputs: Port[] = externalOutputs.map((output, index) => ({
      id: `output_${index}`,
      name: `${output.nodeLabel} - ${output.port.name}`,
      data_type: output.port.data_type,
    }));

    // 如果没有外部输入，添加一个默认输入
    if (mergedInputs.length === 0) {
      mergedInputs.push({ id: 'input', name: '输入', data_type: 'Any' });
    }

    // 如果没有外部输出，添加一个默认输出
    if (mergedOutputs.length === 0) {
      mergedOutputs.push({ id: 'output', name: '输出', data_type: 'Any' });
    }

    // 创建新的合并节点
    const mergedNodeId = nanoid();
    const mergedNode: WorkflowNode = {
      id: mergedNodeId,
      type: 'custom',
      nodeType: { 
        type: 'Custom', 
        config: { 
          language: 'subflow',
          code: '',
          dependencies: [],
          // 存储子节点信息
          subNodes: selectedNodes.map(n => ({
            id: n.id,
            type: n.type,
            nodeType: n.nodeType,
            data: n.data,
            relativePosition: {
              x: n.position.x - mergedPosition.x,
              y: n.position.y - mergedPosition.y,
            },
          })),
          subEdges: internalEdges,
        } 
      },
      position: mergedPosition,
      data: {
        label: name,
        description: description || `包含 ${selectedNodes.length} 个节点的子流程`,
        icon: 'Layers',
        config: {
          subNodeCount: selectedNodes.length,
          originalNodes: selectedNodeIds,
        },
        inputs: mergedInputs,
        outputs: mergedOutputs,
        status: 'idle',
      },
    };

    // 删除原有的外部连线
    [...externalInputs, ...externalOutputs].forEach(item => {
      const edge = 'fromEdge' in item ? item.fromEdge : item.toEdge;
      removeEdge(edge.id);
    });

    // 删除原有节点
    selectedNodeIds.forEach(nodeId => {
      removeNode(nodeId);
    });

    // 添加合并后的节点（直接操作 workflow）
    const store = useWorkflowStore.getState();
    store.workflow?.nodes.push(mergedNode);
    useWorkflowStore.setState({ workflow: { ...store.workflow! } });

    // 重新连接外部连线到新节点
    externalInputs.forEach((input, index) => {
      addEdge({
        source: input.fromEdge.source,
        sourceHandle: input.fromEdge.sourceHandle,
        target: mergedNodeId,
        targetHandle: `input_${index}`,
      });
    });

    externalOutputs.forEach((output, index) => {
      addEdge({
        source: mergedNodeId,
        sourceHandle: `output_${index}`,
        target: output.toEdge.target,
        targetHandle: output.toEdge.targetHandle,
      });
    });

    onMerged();
  };

  const presetColors = [
    '#6366f1', // indigo
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#ef4444', // red
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#3b82f6', // blue
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Icon name="Combine" size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">合并节点</h2>
              <p className="text-sm text-gray-500">将 {selectedNodes.length} 个节点合并为子流程</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              子流程名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入名称"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个子流程的功能"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              节点颜色
            </label>
            <div className="flex gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 包含的节点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              包含的节点
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-[120px] overflow-y-auto">
              {selectedNodes.map((node) => (
                <div key={node.id} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: node.data.icon ? '#6366f1' : '#9ca3af' }}
                  >
                    <Icon name={node.data.icon || 'Circle'} size={10} color="white" />
                  </div>
                  <span className="text-gray-700">{node.data.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 输入输出预览 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                外部输入 ({externalInputs.length})
              </label>
              <div className="bg-gray-50 rounded-lg p-2 space-y-1 text-xs">
                {externalInputs.length === 0 ? (
                  <span className="text-gray-400">无外部输入</span>
                ) : (
                  externalInputs.map((input, i) => (
                    <div key={i} className="flex items-center gap-1 text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      {input.port.name}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                外部输出 ({externalOutputs.length})
              </label>
              <div className="bg-gray-50 rounded-lg p-2 space-y-1 text-xs">
                {externalOutputs.length === 0 ? (
                  <span className="text-gray-400">无外部输出</span>
                ) : (
                  externalOutputs.map((output, i) => (
                    <div key={i} className="flex items-center gap-1 text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {output.port.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleMerge}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="Combine" size={16} />
            合并节点
          </button>
        </div>
      </div>
    </div>
  );
};
