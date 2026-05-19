# synapse-design-md

Synapse 디자인 계약(`DESIGN.md`)을 어느 레포에든 떨어뜨려, 팀과 그 레포에서 일하는 AI 에이전트가 색상·타이포·간격·컴포넌트·접근성에 대해 같은 정본을 보게 합니다.

대상 환경: **macOS / Linux**. Windows에서 쓰려면 WSL을 권장합니다.

## 설치

레포 루트(`.git/`가 있는 디렉터리)에서 한 줄:

```bash
curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/v0.3.0/install.sh | bash
```

스크립트는 다음 세 파일을 씁니다:

| 파일 | 역할 |
| --- | --- |
| `DESIGN.md` | 토큰 계약 + 디자인 본문. 사람이 직접 읽거나, AI 코더가 참조하는 정본. |
| `AGENTS.md` (관리 블록) | Claude Code / Cursor / Codex 같은 AI 에이전트에게 *UI 생성 시 `DESIGN.md`를 참조하라*고 지시. |
| `.synapse-design-md.json` | 버전 스탬프 + 해시. `update` 가 안전하게 동작하기 위한 메타데이터. |

CLI 소스, 평가 도구, 예시, 크롤 결과 같은 내부 자산은 **들어오지 않습니다.**

다른 버전을 받으려면 URL의 태그를 바꾸면 됩니다(예: `v0.4.0`).

## 일상 사용

**개발자** — `DESIGN.md`는 보통의 스펙처럼 읽으면 됩니다. 모든 토큰(`colors.accent`, `typography.body-md`, `components.button-primary` 등)과 규칙이 한 파일에 정리되어 있습니다.

**AI 코더** — 설치가 `AGENTS.md`에 관리 블록을 넣어두기 때문에 별도 프롬프트 엔지니어링 없이도 *"status pill 하나 만들어줘"* 같은 요청이 자동으로 `components.status-pill-success` 토큰으로 해석됩니다.

프롬프트를 짤 때 도움이 되는 패턴:

- 토큰 이름으로 참조하기: *"`card-default` 안에 `table-header-cell` 한 줄과 `table-row` 세 줄을 그려줘."*
- 비-자명한 디자인 결정은 `DESIGN.md` 섹션을 가리키기: *"`Known Accessibility Risks` 의 status pill 카브아웃을 따라줘."*
- 에이전트가 토큰 밖 값을 만들면 다시 토큰으로 풀어달라고 요청 — 보통 맞는 토큰이 이미 존재합니다.

## 업데이트

새 버전이 나오면 같은 한 줄을 다시 실행하면 됩니다:

```bash
curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/v0.3.0/install.sh | bash
```

스크립트의 안전 동작:

- `DESIGN.md` 해시가 설치 당시 그대로일 때만 자동 교체합니다.
- 로컬에서 직접 편집한 흔적이 있으면 `DESIGN.md.synapse-vX.Y.Z.new` 로 새 버전을 옆에 떨궈주고, 원본은 건드리지 않습니다. 직접 diff해서 머지하세요.
- `AGENTS.md` 의 관리 블록(`<!-- synapse-design-md:start -->` ~ `<!-- synapse-design-md:end -->`)만 교체하고, 블록 밖 사용자 편집은 그대로 둡니다.
- 검토 후 강제로 덮어쓰려면:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/v0.3.0/install.sh | bash -s -- --force
  ```

## 자주 발생하는 문제

- **"run this from a git repository root"** — 현재 디렉터리에 `.git/` 이 없습니다. 레포 루트로 이동해서 다시 실행하세요.
- **`DESIGN.md.synapse-vX.Y.Z.new` 가 생겼다** — 로컬 편집과 새 버전이 공존합니다. 두 파일을 diff하고, 필요한 변경만 골라 머지한 뒤 `.new` 파일을 지우거나, `--force` 로 새 버전을 채택하세요.
- **AI 에이전트가 `DESIGN.md`를 보고 있지 않다** — `AGENTS.md` 에 관리 블록이 아직 있는지 확인하세요. 사라졌다면 설치 한 줄을 다시 실행하면 복원됩니다.

## 부가 도구 (선택)

대부분의 사용자는 위의 curl 설치만 있으면 충분합니다. 다음은 필요할 때만 쓰는 보조 도구입니다.

레포를 로컬에 클론한 뒤 (`Node 18+` 필요):

```bash
node ./bin/synapse-design-md.js check    # 설치된 DESIGN.md 의 형식·구조 검증
node ./bin/synapse-design-md.js diff     # 다음 업데이트가 무엇을 바꿀지 미리 보기
node ./bin/synapse-design-md.js doctor   # 설치 상태와 버전 진단
node ./bin/synapse-design-md.js preview  # 모든 토큰을 시각 카탈로그(HTML)로 출력
```

전체 명령은 `--help` 로 확인할 수 있습니다.

## 메인테이너

이 패키지 자체를 유지보수한다면 — sync, 거버넌스, 인증 크롤, CI 게이트, 평가 루브릭 — [`CONTRIBUTING.md`](./CONTRIBUTING.md) 를 보세요.
