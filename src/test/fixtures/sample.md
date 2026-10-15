<link rel="stylesheet" href="style.css">

# Sample Document

Some **bold** text, a [link](https://example.com), and an [anchor](#second-section).

| A | B |
|---|---|
| 1 | 2 |

```ts
const x: number = 42;
```

```mermaid
graph TD
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Great]
  B -->|No| D[Fix it]
```

Local image with space in path:

![icon](img%20dir/my%20icon.png)

Data URI image:

![dot](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)

Math: $E = mc^2$

<div class="bg-box">Background image box</div>

## Second Section

- [ ] task
- [x] done task

```mermaid
sequenceDiagram
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
```

<div id="script-check">Scripts in the document don't run.</div>
<script>document.getElementById("script-check").textContent = "SCRIPT RAN";</script>
<img src="missing-on-purpose.png" alt="" onerror="document.body.setAttribute('data-onerror', 'ran')">
