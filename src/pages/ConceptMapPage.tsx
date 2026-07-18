import { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSupabaseQuery as useLiveQuery } from '@/hooks/useSupabaseQuery';
import { X, BookOpen, ChevronRight, Network } from 'lucide-react';
import { db } from '@/lib/db';
import { GATE_SUBJECTS } from '@/data/subjects';
import type { Question } from '@/types';

// --- Custom node component ---
interface CustomNodeData {
  label: string;
  level: 'root' | 'subject' | 'topic' | 'subtopic';
  count: number;
  subjectName?: string;
}

function ConceptNode({ data }: { data: CustomNodeData }) {
  const styleMap: Record<string, string> = {
    root: 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-400/10 min-w-[140px]',
    subject:
      'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-700 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 min-w-[120px]',
    topic:
      'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 min-w-[100px]',
    subtopic:
      'bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-700 hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 min-w-[90px]',
  };

  const sizeMap: Record<string, string> = {
    root: 'text-sm font-bold px-5 py-3',
    subject: 'text-xs font-semibold px-4 py-2.5',
    topic: 'text-[11px] font-medium px-3 py-2',
    subtopic: 'text-[10px] font-medium px-2.5 py-1.5',
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-gray-400 dark:!bg-gray-500 !w-2 !h-2" />
      <div
        className={`rounded-lg border transition-all cursor-pointer text-center ${styleMap[data.level]} ${sizeMap[data.level]}`}
      >
        <div className="truncate max-w-[160px]">{data.label}</div>
        {data.count > 0 && (
          <div
            className={`mt-1 text-[9px] font-medium ${
              data.level === 'root'
                ? 'text-indigo-200'
                : data.level === 'subject'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : data.level === 'topic'
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-purple-500 dark:text-purple-400'
            }`}
          >
            {data.count} Q{data.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400 dark:!bg-gray-500 !w-2 !h-2" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  concept: ConceptNode,
};

// --- Layout calculation ---
function buildGraphData(
  questionCounts: Record<string, number>,
  expandedSubjects: Set<string>,
  expandedTopics: Set<string>
) {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  const totalCount = Object.values(questionCounts).reduce((a, b) => a + b, 0);

  // Root node
  nodes.push({
    id: 'root',
    type: 'concept',
    position: { x: 0, y: 0 },
    data: { label: 'GATE CSE', level: 'root', count: totalCount },
  });

  // Calculate vertical spacing
  const subjectSpacing = 100;
  const topicSpacing = 70;
  const subtopicSpacing = 55;

  let currentY = 0;
  const subjectX = 280;
  const topicX = 560;
  const subtopicX = 820;

  // First pass: calculate total height
  let totalHeight = 0;
  for (const subject of GATE_SUBJECTS) {
    totalHeight += subjectSpacing;
    if (expandedSubjects.has(subject.name)) {
      for (const topic of subject.topics) {
        totalHeight += topicSpacing;
        if (expandedTopics.has(`${subject.name}::${topic.name}`)) {
          totalHeight += topic.subtopics.length * subtopicSpacing;
        }
      }
    }
  }

  // Start Y so the tree is vertically centered relative to root
  currentY = -totalHeight / 2;

  for (const subject of GATE_SUBJECTS) {
    const subjectId = `s:${subject.name}`;
    const subjectCount = subject.topics.reduce(
      (sum, t) =>
        sum +
        t.subtopics.reduce(
          (s2, st) => s2 + (questionCounts[`${subject.name}::${t.name}::${st.name}`] ?? 0),
          0
        ),
      0
    );

    nodes.push({
      id: subjectId,
      type: 'concept',
      position: { x: subjectX, y: currentY },
      data: { label: subject.name, level: 'subject', count: subjectCount, subjectName: subject.name },
    });

    edges.push({
      id: `e:root->${subjectId}`,
      source: 'root',
      target: subjectId,
      style: { stroke: '#6366f1', strokeWidth: 1.5 },
      animated: false,
    });

    if (expandedSubjects.has(subject.name)) {
      let topicY = currentY;
      for (const topic of subject.topics) {
        const topicId = `t:${subject.name}::${topic.name}`;
        const topicCount = topic.subtopics.reduce(
          (s, st) => s + (questionCounts[`${subject.name}::${topic.name}::${st.name}`] ?? 0),
          0
        );

        nodes.push({
          id: topicId,
          type: 'concept',
          position: { x: topicX, y: topicY },
          data: { label: topic.name, level: 'topic', count: topicCount, subjectName: subject.name },
        });

        edges.push({
          id: `e:${subjectId}->${topicId}`,
          source: subjectId,
          target: topicId,
          style: { stroke: '#3b82f6', strokeWidth: 1 },
        });

        if (expandedTopics.has(`${subject.name}::${topic.name}`)) {
          let subtopicY = topicY;
          for (const subtopic of topic.subtopics) {
            const subtopicId = `st:${subject.name}::${topic.name}::${subtopic.name}`;
            const stCount = questionCounts[`${subject.name}::${topic.name}::${subtopic.name}`] ?? 0;

            nodes.push({
              id: subtopicId,
              type: 'concept',
              position: { x: subtopicX, y: subtopicY },
              data: { label: subtopic.name, level: 'subtopic', count: stCount, subjectName: subject.name },
            });

            edges.push({
              id: `e:${topicId}->${subtopicId}`,
              source: topicId,
              target: subtopicId,
              style: { stroke: '#a855f7', strokeWidth: 1 },
            });

            subtopicY += subtopicSpacing;
          }
          topicY = subtopicY;
        } else {
          topicY += topicSpacing;
        }
      }
      currentY = topicY;
    } else {
      currentY += subjectSpacing;
    }
  }

  // Center root vertically
  const yValues = nodes.filter((n) => n.id !== 'root').map((n) => n.position.y);
  if (yValues.length > 0) {
    const midY = (Math.min(...yValues) + Math.max(...yValues)) / 2;
    nodes[0].position.y = midY;
  }

  return { nodes, edges };
}

// --- Sidebar panel ---
function SidePanel({
  nodeId,
  nodeLabel,
  nodeLevel,
  questions,
  onClose,
}: {
  nodeId: string;
  nodeLabel: string;
  nodeLevel: string;
  questions: Question[];
  onClose: () => void;
}) {
  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="min-w-0">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide mb-1 ${
              nodeLevel === 'subject'
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                : nodeLevel === 'topic'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
            }`}
          >
            {nodeLevel}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {nodeLabel}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No questions found for this node. Import papers to populate.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {questions.slice(0, 50).map((q) => (
              <li
                key={q.id}
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {q.year} | Q{q.questionNumber}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      q.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : q.difficulty === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                  {q.question}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span>{q.type}</span>
                </div>
              </li>
            ))}
            {questions.length > 50 && (
              <li className="px-4 py-3 text-center text-xs text-gray-400">
                +{questions.length - 50} more questions
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {questions.length} question{questions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// --- Main page ---
export default function ConceptMapPage() {
  const allQuestions = useLiveQuery(() => db.questions.toArray()) ?? [];
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    level: string;
  } | null>(null);

  // Count questions by subject::topic::subtopic
  const questionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of allQuestions) {
      const key = `${q.subject}::${q.topic}::${q.subtopic}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [allQuestions]);

  // Build graph
  const { nodes, edges } = useMemo(
    () => buildGraphData(questionCounts, expandedSubjects, expandedTopics),
    [questionCounts, expandedSubjects, expandedTopics]
  );

  // Get questions for selected node
  const selectedQuestions = useMemo(() => {
    if (!selectedNode) return [];
    const { id } = selectedNode;

    if (id === 'root') return allQuestions;

    if (id.startsWith('s:')) {
      const subject = id.slice(2);
      return allQuestions.filter((q) => q.subject === subject);
    }

    if (id.startsWith('t:')) {
      const parts = id.slice(2).split('::');
      return allQuestions.filter((q) => q.subject === parts[0] && q.topic === parts[1]);
    }

    if (id.startsWith('st:')) {
      const parts = id.slice(3).split('::');
      return allQuestions.filter(
        (q) => q.subject === parts[0] && q.topic === parts[1] && q.subtopic === parts[2]
      );
    }

    return [];
  }, [selectedNode, allQuestions]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as CustomNodeData;

      // Toggle expand/collapse
      if (data.level === 'subject') {
        setExpandedSubjects((prev) => {
          const next = new Set(prev);
          if (next.has(data.label)) {
            next.delete(data.label);
            // Also collapse all topics of this subject
            setExpandedTopics((tp) => {
              const nextTp = new Set(tp);
              for (const key of tp) {
                if (key.startsWith(`${data.label}::`)) nextTp.delete(key);
              }
              return nextTp;
            });
          } else {
            next.add(data.label);
          }
          return next;
        });
      } else if (data.level === 'topic') {
        const topicKey = node.id.slice(2); // "subject::topic"
        setExpandedTopics((prev) => {
          const next = new Set(prev);
          if (next.has(topicKey)) {
            next.delete(topicKey);
          } else {
            next.add(topicKey);
          }
          return next;
        });
      }

      // Show sidebar
      setSelectedNode({
        id: node.id,
        label: data.label,
        level: data.level,
      });
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Network className="w-6 h-6 text-indigo-500" />
              Concept Map
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Interactive knowledge graph of GATE CSE syllabus. Click nodes to expand and view
              questions.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              Subjects
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500" />
              Topics
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500" />
              Subtopics
            </span>
          </div>
        </div>
      </div>

      {/* Breadcrumb hint */}
      {selectedNode && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900">
          <div className="max-w-7xl mx-auto flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-300">
            <span>Selected:</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium">{selectedNode.label}</span>
            <span className="text-indigo-400 dark:text-indigo-500 ml-2">
              ({selectedQuestions.length} questions)
            </span>
          </div>
        </div>
      )}

      {/* ReactFlow canvas */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-lg !rounded-xl [&>button]:!bg-white dark:[&>button]:!bg-gray-800 [&>button]:!border-gray-200 dark:[&>button]:!border-gray-700 [&>button]:!text-gray-600 dark:[&>button]:!text-gray-300 [&>button:hover]:!bg-gray-50 dark:[&>button:hover]:!bg-gray-700"
          />
          <MiniMap
            className="!bg-gray-100 dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg"
            nodeColor={(node) => {
              const level = (node.data as CustomNodeData)?.level;
              switch (level) {
                case 'root':
                  return '#6366f1';
                case 'subject':
                  return '#818cf8';
                case 'topic':
                  return '#60a5fa';
                case 'subtopic':
                  return '#a78bfa';
                default:
                  return '#9ca3af';
              }
            }}
            maskColor="rgba(0,0,0,0.08)"
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" className="dark:!bg-gray-950" />
        </ReactFlow>

        {/* Side panel */}
        {selectedNode && (
          <SidePanel
            nodeId={selectedNode.id}
            nodeLabel={selectedNode.label}
            nodeLevel={selectedNode.level}
            questions={selectedQuestions}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
