export const chatCSS = `
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
  .thinking-dot {
    animation: dot-bounce 1.4s infinite ease-in-out both;
  }
  @keyframes content-enter {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .assistant-content-enter {
    animation: content-enter 0.3s ease-out;
  }
`
