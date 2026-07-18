import type { SubjectData } from '@/types';

export const GATE_SUBJECTS: SubjectData[] = [
  {
    name: 'General Aptitude',
    topics: [
      { name: 'Verbal Ability', subtopics: [
        { name: 'English Grammar', concepts: ['Articles', 'Prepositions', 'Tenses', 'Subject-Verb Agreement'] },
        { name: 'Sentence Completion', concepts: ['Vocabulary', 'Context Clues'] },
        { name: 'Reading Comprehension', concepts: ['Main Idea', 'Inference', 'Tone'] },
        { name: 'Verbal Analogies', concepts: ['Word Relationships', 'Synonyms', 'Antonyms'] },
        { name: 'Critical Reasoning', concepts: ['Assumptions', 'Conclusions', 'Strengthening/Weakening'] },
      ]},
      { name: 'Quantitative Aptitude', subtopics: [
        { name: 'Data Interpretation', concepts: ['Bar Charts', 'Pie Charts', 'Tables', 'Line Graphs'] },
        { name: 'Number Series', concepts: ['Arithmetic Progression', 'Geometric Progression', 'Fibonacci'] },
        { name: 'Percentages', concepts: ['Profit/Loss', 'Discount', 'Interest'] },
        { name: 'Permutation & Combination', concepts: ['nPr', 'nCr', 'Arrangements'] },
        { name: 'Probability', concepts: ['Basic Probability', 'Conditional Probability', 'Bayes Theorem'] },
      ]},
    ],
  },
  {
    name: 'Engineering Mathematics',
    topics: [
      { name: 'Linear Algebra', subtopics: [
        { name: 'Matrix Operations', concepts: ['Addition', 'Multiplication', 'Transpose', 'Inverse'] },
        { name: 'Eigenvalues & Eigenvectors', concepts: ['Characteristic Equation', 'Diagonalization'] },
        { name: 'System of Linear Equations', concepts: ['Gauss Elimination', 'Rank', 'Consistency'] },
        { name: 'Vector Spaces', concepts: ['Basis', 'Dimension', 'Linear Independence'] },
      ]},
      { name: 'Calculus', subtopics: [
        { name: 'Limits & Continuity', concepts: ['L\'Hopital Rule', 'Squeeze Theorem'] },
        { name: 'Differentiation', concepts: ['Chain Rule', 'Partial Derivatives', 'Maxima/Minima'] },
        { name: 'Integration', concepts: ['Definite Integrals', 'Double Integrals', 'Applications'] },
        { name: 'Differential Equations', concepts: ['First Order', 'Second Order', 'Linear DE'] },
      ]},
      { name: 'Probability & Statistics', subtopics: [
        { name: 'Random Variables', concepts: ['PDF', 'CDF', 'Expectation', 'Variance'] },
        { name: 'Distributions', concepts: ['Normal', 'Binomial', 'Poisson', 'Uniform', 'Exponential'] },
        { name: 'Hypothesis Testing', concepts: ['Null Hypothesis', 'p-value', 'Confidence Interval'] },
      ]},
      { name: 'Combinatorics', subtopics: [
        { name: 'Counting Principles', concepts: ['Pigeonhole', 'Inclusion-Exclusion'] },
        { name: 'Recurrence Relations', concepts: ['Homogeneous', 'Non-homogeneous', 'Generating Functions'] },
      ]},
    ],
  },
  {
    name: 'Discrete Mathematics',
    topics: [
      { name: 'Propositional Logic', subtopics: [
        { name: 'Logical Connectives', concepts: ['AND', 'OR', 'NOT', 'Implication', 'Biconditional'] },
        { name: 'Tautology & Contradiction', concepts: ['Truth Tables', 'Logical Equivalences'] },
        { name: 'Normal Forms', concepts: ['CNF', 'DNF', 'POS', 'SOP'] },
      ]},
      { name: 'Predicate Logic', subtopics: [
        { name: 'Quantifiers', concepts: ['Universal', 'Existential', 'Nested Quantifiers'] },
        { name: 'Inference Rules', concepts: ['Modus Ponens', 'Modus Tollens', 'Resolution'] },
      ]},
      { name: 'Set Theory', subtopics: [
        { name: 'Set Operations', concepts: ['Union', 'Intersection', 'Difference', 'Complement'] },
        { name: 'Relations', concepts: ['Reflexive', 'Symmetric', 'Transitive', 'Equivalence', 'Partial Order'] },
        { name: 'Functions', concepts: ['Injection', 'Surjection', 'Bijection', 'Composition'] },
      ]},
      { name: 'Graph Theory', subtopics: [
        { name: 'Graph Types', concepts: ['Directed', 'Undirected', 'Weighted', 'Bipartite', 'Planar'] },
        { name: 'Graph Properties', concepts: ['Degree', 'Path', 'Cycle', 'Connectivity'] },
        { name: 'Trees', concepts: ['Spanning Tree', 'Binary Tree', 'BST'] },
        { name: 'Graph Coloring', concepts: ['Chromatic Number', 'k-Coloring'] },
        { name: 'Matching', concepts: ['Maximum Matching', 'Hall\'s Theorem'] },
      ]},
      { name: 'Group Theory', subtopics: [
        { name: 'Groups', concepts: ['Abelian', 'Cyclic', 'Subgroups', 'Lagrange Theorem'] },
        { name: 'Lattices & Boolean Algebra', concepts: ['Poset', 'Hasse Diagram', 'Boolean Functions'] },
      ]},
    ],
  },
  {
    name: 'Digital Logic',
    topics: [
      { name: 'Boolean Algebra', subtopics: [
        { name: 'Minimization', concepts: ['K-Map', 'Quine-McCluskey', 'Don\'t Care Conditions'] },
        { name: 'Logic Gates', concepts: ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'] },
      ]},
      { name: 'Combinational Circuits', subtopics: [
        { name: 'Arithmetic Circuits', concepts: ['Adder', 'Subtractor', 'Multiplier', 'Comparator'] },
        { name: 'Data Processing', concepts: ['MUX', 'DEMUX', 'Encoder', 'Decoder'] },
      ]},
      { name: 'Sequential Circuits', subtopics: [
        { name: 'Flip-Flops', concepts: ['SR', 'JK', 'D', 'T', 'Master-Slave'] },
        { name: 'Counters', concepts: ['Synchronous', 'Asynchronous', 'Ring', 'Johnson'] },
        { name: 'Registers', concepts: ['Shift Register', 'SISO', 'SIPO', 'PISO', 'PIPO'] },
        { name: 'State Machines', concepts: ['Mealy', 'Moore', 'State Minimization'] },
      ]},
      { name: 'Number Systems', subtopics: [
        { name: 'Representations', concepts: ['Binary', 'Octal', 'Hexadecimal', 'BCD'] },
        { name: 'Signed Numbers', concepts: ['1\'s Complement', '2\'s Complement', 'Sign-Magnitude'] },
        { name: 'Floating Point', concepts: ['IEEE 754', 'Single Precision', 'Double Precision'] },
      ]},
    ],
  },
  {
    name: 'Computer Organization & Architecture',
    topics: [
      { name: 'CPU Design', subtopics: [
        { name: 'Instruction Set Architecture', concepts: ['RISC', 'CISC', 'Addressing Modes'] },
        { name: 'Pipelining', concepts: ['Hazards', 'Forwarding', 'Stalling', 'Branch Prediction'] },
        { name: 'ALU Design', concepts: ['Fixed Point', 'Floating Point', 'Booth\'s Algorithm'] },
      ]},
      { name: 'Memory', subtopics: [
        { name: 'Cache', concepts: ['Direct Mapped', 'Set Associative', 'Fully Associative', 'Replacement Policies'] },
        { name: 'Virtual Memory', concepts: ['Paging', 'TLB', 'Page Table', 'Page Fault'] },
        { name: 'Memory Hierarchy', concepts: ['SRAM', 'DRAM', 'ROM', 'Flash'] },
      ]},
      { name: 'I/O Organization', subtopics: [
        { name: 'I/O Techniques', concepts: ['Programmed I/O', 'Interrupt Driven', 'DMA'] },
        { name: 'Buses', concepts: ['Address Bus', 'Data Bus', 'Control Bus'] },
      ]},
      { name: 'Performance', subtopics: [
        { name: 'Metrics', concepts: ['CPI', 'MIPS', 'Throughput', 'Speedup'] },
        { name: 'Amdahl\'s Law', concepts: ['Parallel Speedup', 'Serial Fraction'] },
      ]},
    ],
  },
  {
    name: 'Programming in C',
    topics: [
      { name: 'Basics', subtopics: [
        { name: 'Data Types', concepts: ['int', 'float', 'char', 'void', 'Type Casting'] },
        { name: 'Operators', concepts: ['Arithmetic', 'Relational', 'Logical', 'Bitwise', 'Precedence'] },
        { name: 'Control Flow', concepts: ['if-else', 'switch', 'for', 'while', 'do-while', 'break', 'continue'] },
      ]},
      { name: 'Functions', subtopics: [
        { name: 'Function Basics', concepts: ['Declaration', 'Definition', 'Call by Value', 'Call by Reference'] },
        { name: 'Recursion', concepts: ['Base Case', 'Tail Recursion', 'Stack Overflow'] },
        { name: 'Scope', concepts: ['Local', 'Global', 'Static', 'Extern'] },
      ]},
      { name: 'Pointers', subtopics: [
        { name: 'Pointer Basics', concepts: ['Declaration', 'Dereferencing', 'Pointer Arithmetic'] },
        { name: 'Arrays & Pointers', concepts: ['Array Decay', 'Pointer to Array', 'Array of Pointers'] },
        { name: 'Dynamic Memory', concepts: ['malloc', 'calloc', 'realloc', 'free', 'Memory Leaks'] },
        { name: 'Function Pointers', concepts: ['Declaration', 'Callback Functions'] },
      ]},
      { name: 'Structures & Unions', subtopics: [
        { name: 'Structures', concepts: ['Definition', 'Nested Structures', 'Self-Referential'] },
        { name: 'Unions', concepts: ['Memory Sharing', 'Size Calculation'] },
        { name: 'Typedef & Enum', concepts: ['Type Aliases', 'Enumeration'] },
      ]},
      { name: 'File I/O', subtopics: [
        { name: 'File Operations', concepts: ['fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf'] },
      ]},
    ],
  },
  {
    name: 'Data Structures',
    topics: [
      { name: 'Arrays', subtopics: [
        { name: '1D Arrays', concepts: ['Traversal', 'Insertion', 'Deletion', 'Search'] },
        { name: '2D Arrays', concepts: ['Row Major', 'Column Major', 'Sparse Matrix'] },
        { name: 'Strings', concepts: ['Pattern Matching', 'KMP', 'Rabin-Karp'] },
      ]},
      { name: 'Linked Lists', subtopics: [
        { name: 'Singly Linked List', concepts: ['Insertion', 'Deletion', 'Reversal'] },
        { name: 'Doubly Linked List', concepts: ['Insertion', 'Deletion', 'Traversal'] },
        { name: 'Circular Linked List', concepts: ['Operations', 'Applications'] },
      ]},
      { name: 'Stacks', subtopics: [
        { name: 'Stack Operations', concepts: ['Push', 'Pop', 'Peek', 'Overflow', 'Underflow'] },
        { name: 'Applications', concepts: ['Infix to Postfix', 'Expression Evaluation', 'Parenthesis Matching'] },
      ]},
      { name: 'Queues', subtopics: [
        { name: 'Queue Types', concepts: ['Simple Queue', 'Circular Queue', 'Deque', 'Priority Queue'] },
        { name: 'Applications', concepts: ['BFS', 'Scheduling', 'Buffer'] },
      ]},
      { name: 'Trees', subtopics: [
        { name: 'Binary Trees', concepts: ['Traversals', 'Height', 'Diameter', 'Mirror'] },
        { name: 'BST', concepts: ['Insert', 'Delete', 'Search', 'Inorder Successor'] },
        { name: 'Balanced Trees', concepts: ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree'] },
        { name: 'Heap', concepts: ['Min Heap', 'Max Heap', 'Heapify', 'Heap Sort'] },
        { name: 'Trie', concepts: ['Insert', 'Search', 'Delete', 'Applications'] },
      ]},
      { name: 'Graphs', subtopics: [
        { name: 'Representations', concepts: ['Adjacency Matrix', 'Adjacency List'] },
        { name: 'Traversals', concepts: ['BFS', 'DFS'] },
        { name: 'Applications', concepts: ['Topological Sort', 'Strongly Connected Components'] },
      ]},
      { name: 'Hashing', subtopics: [
        { name: 'Hash Functions', concepts: ['Division', 'Multiplication', 'Universal'] },
        { name: 'Collision Resolution', concepts: ['Chaining', 'Open Addressing', 'Linear Probing', 'Quadratic Probing'] },
      ]},
    ],
  },
  {
    name: 'Algorithms',
    topics: [
      { name: 'Sorting', subtopics: [
        { name: 'Comparison Based', concepts: ['Bubble', 'Selection', 'Insertion', 'Merge', 'Quick', 'Heap'] },
        { name: 'Non-Comparison', concepts: ['Counting', 'Radix', 'Bucket'] },
        { name: 'Analysis', concepts: ['Time Complexity', 'Space Complexity', 'Stability', 'Lower Bound'] },
      ]},
      { name: 'Searching', subtopics: [
        { name: 'Linear Search', concepts: ['Sequential', 'Sentinel'] },
        { name: 'Binary Search', concepts: ['Iterative', 'Recursive', 'Variants'] },
      ]},
      { name: 'Graph Algorithms', subtopics: [
        { name: 'Shortest Path', concepts: ['Dijkstra', 'Bellman-Ford', 'Floyd-Warshall'] },
        { name: 'MST', concepts: ['Prim', 'Kruskal'] },
        { name: 'Flow', concepts: ['Ford-Fulkerson', 'Max Flow Min Cut'] },
      ]},
      { name: 'Dynamic Programming', subtopics: [
        { name: 'Classical Problems', concepts: ['LCS', 'LIS', 'Knapsack', 'Matrix Chain', 'Edit Distance'] },
        { name: 'Techniques', concepts: ['Memoization', 'Tabulation', 'State Transition'] },
      ]},
      { name: 'Greedy Algorithms', subtopics: [
        { name: 'Classical Problems', concepts: ['Activity Selection', 'Huffman Coding', 'Fractional Knapsack'] },
        { name: 'Properties', concepts: ['Greedy Choice', 'Optimal Substructure'] },
      ]},
      { name: 'Divide & Conquer', subtopics: [
        { name: 'Problems', concepts: ['Merge Sort', 'Quick Sort', 'Strassen', 'Closest Pair'] },
        { name: 'Analysis', concepts: ['Master Theorem', 'Recurrence Relations'] },
      ]},
      { name: 'Complexity', subtopics: [
        { name: 'Asymptotic Notation', concepts: ['Big-O', 'Omega', 'Theta', 'Little-o'] },
        { name: 'Complexity Classes', concepts: ['P', 'NP', 'NP-Complete', 'NP-Hard', 'Reductions'] },
      ]},
      { name: 'Backtracking', subtopics: [
        { name: 'Problems', concepts: ['N-Queens', 'Subset Sum', 'Graph Coloring', 'Hamiltonian Cycle'] },
      ]},
    ],
  },
  {
    name: 'Theory of Computation',
    topics: [
      { name: 'Finite Automata', subtopics: [
        { name: 'DFA', concepts: ['Construction', 'Minimization', 'Complement'] },
        { name: 'NFA', concepts: ['Construction', 'NFA to DFA', 'Epsilon NFA'] },
        { name: 'Regular Expressions', concepts: ['Operations', 'RE to FA', 'FA to RE'] },
      ]},
      { name: 'Regular Languages', subtopics: [
        { name: 'Properties', concepts: ['Closure Properties', 'Pumping Lemma', 'Myhill-Nerode'] },
      ]},
      { name: 'Context-Free Languages', subtopics: [
        { name: 'CFG', concepts: ['Derivation', 'Parse Tree', 'Ambiguity', 'CNF', 'GNF'] },
        { name: 'PDA', concepts: ['Construction', 'Acceptance', 'CFG to PDA'] },
        { name: 'Properties', concepts: ['Closure Properties', 'CFL Pumping Lemma', 'CYK Algorithm'] },
      ]},
      { name: 'Turing Machines', subtopics: [
        { name: 'TM Variants', concepts: ['Standard TM', 'Multi-tape', 'Non-deterministic TM'] },
        { name: 'Decidability', concepts: ['Decidable', 'Semi-decidable', 'Undecidable', 'Halting Problem'] },
        { name: 'Reducibility', concepts: ['Many-one Reduction', 'Rice\'s Theorem'] },
      ]},
    ],
  },
  {
    name: 'Compiler Design',
    topics: [
      { name: 'Lexical Analysis', subtopics: [
        { name: 'Tokenization', concepts: ['Tokens', 'Lexemes', 'Patterns'] },
        { name: 'Finite Automata', concepts: ['NFA', 'DFA', 'Regular Expressions'] },
      ]},
      { name: 'Syntax Analysis', subtopics: [
        { name: 'Top-Down Parsing', concepts: ['Recursive Descent', 'LL(1)', 'First/Follow Sets'] },
        { name: 'Bottom-Up Parsing', concepts: ['LR(0)', 'SLR', 'CLR', 'LALR', 'Operator Precedence'] },
        { name: 'Parse Trees', concepts: ['Derivation', 'AST', 'Ambiguity Resolution'] },
      ]},
      { name: 'Semantic Analysis', subtopics: [
        { name: 'SDT', concepts: ['Synthesized Attributes', 'Inherited Attributes', 'S-attributed', 'L-attributed'] },
        { name: 'Type Checking', concepts: ['Type Systems', 'Type Inference', 'Coercion'] },
      ]},
      { name: 'Intermediate Code', subtopics: [
        { name: 'Representations', concepts: ['Three Address Code', 'Quadruples', 'Triples', 'DAG'] },
      ]},
      { name: 'Code Optimization', subtopics: [
        { name: 'Techniques', concepts: ['Constant Folding', 'Dead Code Elimination', 'Loop Optimization', 'CSE'] },
        { name: 'Data Flow Analysis', concepts: ['Reaching Definitions', 'Live Variables', 'Available Expressions'] },
      ]},
      { name: 'Code Generation', subtopics: [
        { name: 'Register Allocation', concepts: ['Graph Coloring', 'Spilling'] },
        { name: 'Instruction Selection', concepts: ['Tree Pattern Matching', 'Peephole Optimization'] },
      ]},
      { name: 'Runtime Environments', subtopics: [
        { name: 'Memory Management', concepts: ['Stack Allocation', 'Heap Allocation', 'Activation Records'] },
        { name: 'Symbol Table', concepts: ['Hash Table', 'Scope Management'] },
      ]},
    ],
  },
  {
    name: 'Operating Systems',
    topics: [
      { name: 'Process Management', subtopics: [
        { name: 'Processes', concepts: ['Process States', 'PCB', 'Context Switch', 'IPC'] },
        { name: 'Threads', concepts: ['User Threads', 'Kernel Threads', 'Multithreading Models'] },
        { name: 'Scheduling', concepts: ['FCFS', 'SJF', 'Priority', 'Round Robin', 'MLFQ'] },
      ]},
      { name: 'Synchronization', subtopics: [
        { name: 'Critical Section', concepts: ['Mutual Exclusion', 'Peterson\'s Solution', 'Hardware Solutions'] },
        { name: 'Semaphores', concepts: ['Binary', 'Counting', 'Producer-Consumer', 'Readers-Writers'] },
        { name: 'Monitors', concepts: ['Condition Variables', 'Mesa vs Hoare'] },
      ]},
      { name: 'Deadlocks', subtopics: [
        { name: 'Conditions', concepts: ['Mutual Exclusion', 'Hold & Wait', 'No Preemption', 'Circular Wait'] },
        { name: 'Handling', concepts: ['Prevention', 'Avoidance', 'Detection', 'Recovery', 'Banker\'s Algorithm'] },
      ]},
      { name: 'Memory Management', subtopics: [
        { name: 'Techniques', concepts: ['Contiguous', 'Paging', 'Segmentation', 'Segmented Paging'] },
        { name: 'Virtual Memory', concepts: ['Demand Paging', 'Page Replacement', 'Thrashing', 'Working Set'] },
        { name: 'Page Replacement', concepts: ['FIFO', 'LRU', 'Optimal', 'Clock', 'Belady\'s Anomaly'] },
      ]},
      { name: 'File Systems', subtopics: [
        { name: 'Organization', concepts: ['Directory Structure', 'File Allocation', 'FAT', 'Inode'] },
        { name: 'Disk Scheduling', concepts: ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'] },
      ]},
    ],
  },
  {
    name: 'Database Management Systems',
    topics: [
      { name: 'Relational Model', subtopics: [
        { name: 'Relational Algebra', concepts: ['Select', 'Project', 'Join', 'Division', 'Rename'] },
        { name: 'Relational Calculus', concepts: ['Tuple Calculus', 'Domain Calculus'] },
        { name: 'SQL', concepts: ['DDL', 'DML', 'Joins', 'Subqueries', 'Aggregation', 'Views'] },
      ]},
      { name: 'Normalization', subtopics: [
        { name: 'Normal Forms', concepts: ['1NF', '2NF', '3NF', 'BCNF', '4NF', '5NF'] },
        { name: 'Functional Dependencies', concepts: ['Closure', 'Canonical Cover', 'Armstrong\'s Axioms'] },
        { name: 'Decomposition', concepts: ['Lossless Join', 'Dependency Preservation'] },
      ]},
      { name: 'Transactions', subtopics: [
        { name: 'ACID Properties', concepts: ['Atomicity', 'Consistency', 'Isolation', 'Durability'] },
        { name: 'Concurrency Control', concepts: ['2PL', 'Timestamp', 'MVCC', 'Serializability'] },
        { name: 'Recovery', concepts: ['Log-based', 'Checkpointing', 'ARIES'] },
        { name: 'Schedules', concepts: ['Conflict Serializable', 'View Serializable', 'Precedence Graph'] },
      ]},
      { name: 'Indexing', subtopics: [
        { name: 'Index Types', concepts: ['Primary', 'Secondary', 'Dense', 'Sparse'] },
        { name: 'Tree Indices', concepts: ['B-Tree', 'B+ Tree'] },
        { name: 'Hashing', concepts: ['Static', 'Dynamic', 'Extendible'] },
      ]},
      { name: 'ER Model', subtopics: [
        { name: 'ER Diagrams', concepts: ['Entities', 'Attributes', 'Relationships', 'Cardinality'] },
        { name: 'ER to Relational', concepts: ['Mapping Rules', 'Generalization', 'Specialization'] },
      ]},
    ],
  },
  {
    name: 'Computer Networks',
    topics: [
      { name: 'Network Models', subtopics: [
        { name: 'OSI Model', concepts: ['7 Layers', 'Functions', 'Protocols'] },
        { name: 'TCP/IP Model', concepts: ['4 Layers', 'Comparison with OSI'] },
      ]},
      { name: 'Physical Layer', subtopics: [
        { name: 'Transmission Media', concepts: ['Guided', 'Unguided'] },
        { name: 'Multiplexing', concepts: ['FDM', 'TDM', 'WDM'] },
        { name: 'Encoding', concepts: ['NRZ', 'Manchester', 'Differential Manchester'] },
      ]},
      { name: 'Data Link Layer', subtopics: [
        { name: 'Error Detection', concepts: ['Parity', 'CRC', 'Checksum', 'Hamming Code'] },
        { name: 'Flow Control', concepts: ['Stop-and-Wait', 'Sliding Window', 'Go-Back-N', 'Selective Repeat'] },
        { name: 'MAC', concepts: ['ALOHA', 'CSMA/CD', 'CSMA/CA', 'Token Ring'] },
        { name: 'Ethernet', concepts: ['Frame Format', 'Switching', 'VLAN'] },
      ]},
      { name: 'Network Layer', subtopics: [
        { name: 'IP Addressing', concepts: ['IPv4', 'Subnetting', 'CIDR', 'IPv6', 'NAT'] },
        { name: 'Routing', concepts: ['Distance Vector', 'Link State', 'RIP', 'OSPF', 'BGP'] },
        { name: 'IP Protocol', concepts: ['Fragmentation', 'ICMP', 'ARP', 'DHCP'] },
      ]},
      { name: 'Transport Layer', subtopics: [
        { name: 'TCP', concepts: ['Connection Management', 'Flow Control', 'Congestion Control', 'Reliability'] },
        { name: 'UDP', concepts: ['Connectionless', 'Applications'] },
        { name: 'Congestion Control', concepts: ['Slow Start', 'AIMD', 'Fast Retransmit', 'Fast Recovery'] },
      ]},
      { name: 'Application Layer', subtopics: [
        { name: 'DNS', concepts: ['Resolution', 'Record Types', 'Hierarchy'] },
        { name: 'HTTP', concepts: ['Methods', 'Status Codes', 'Persistent Connections'] },
        { name: 'Email', concepts: ['SMTP', 'POP3', 'IMAP'] },
        { name: 'FTP', concepts: ['Active Mode', 'Passive Mode'] },
      ]},
      { name: 'Network Security', subtopics: [
        { name: 'Cryptography', concepts: ['Symmetric', 'Asymmetric', 'RSA', 'DES', 'AES'] },
        { name: 'Security Protocols', concepts: ['SSL/TLS', 'IPSec', 'Firewalls'] },
        { name: 'Authentication', concepts: ['Digital Signatures', 'Certificates', 'Kerberos'] },
      ]},
    ],
  },
];

export const SUBJECT_NAMES = GATE_SUBJECTS.map(s => s.name);

export function getAllTopics(subject: string): string[] {
  const subj = GATE_SUBJECTS.find(s => s.name === subject);
  return subj ? subj.topics.map(t => t.name) : [];
}

export function getAllSubtopics(subject: string, topic: string): string[] {
  const subj = GATE_SUBJECTS.find(s => s.name === subject);
  if (!subj) return [];
  const t = subj.topics.find(tp => tp.name === topic);
  return t ? t.subtopics.map(st => st.name) : [];
}

export function getAllConcepts(subject: string, topic: string, subtopic: string): string[] {
  const subj = GATE_SUBJECTS.find(s => s.name === subject);
  if (!subj) return [];
  const t = subj.topics.find(tp => tp.name === topic);
  if (!t) return [];
  const st = t.subtopics.find(s => s.name === subtopic);
  return st ? st.concepts : [];
}
