import './App.css'

const tracks = [
  {
    title: '世界国家',
    description: '从轮廓和位置主动回忆国家名称，而不是只会被动识别几个大国。',
  },
  {
    title: '中国地级行政区',
    description:
      '把地级市、自治州、地区、盟等同级单位放进同一个训练框架里，逐步建立真正的空间记忆。',
  },
]

const scopeItems = [
  '纯前端网页，先不引入后端和账号系统。',
  '第一版至少支持“看图猜名”和“看名点图”两种模式。',
  '错题回放必须进入首版，而不是等以后再补。',
]

const nextSteps = [
  '补 PRD，锁定首版训练流和页面信息架构。',
  '确定世界国家与中国地级行政区的数据来源与口径。',
  '开始实现基础地图渲染与交互状态管理。',
]

const principles = [
  '目标是记住，不是浏览。',
  '训练必须强调主动回忆，而不是提示过多的被动识别。',
  '世界国家与中国地级行政区共用一个记忆训练框架。',
]

function App() {
  return (
    <main className="page-shell">
      <div className="frame">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Week 13 side project
            </div>

            <div>
              <h1>map-memory</h1>
              <p>
                一个为地图区划记忆而生的网页。目标不是“看过地图”，而是通过主动回忆，
                真正记住世界上每一个国家，以及中国每一个地级行政区。
              </p>
            </div>

            <div className="hero-actions">
              <span className="button button-primary">Repo scaffolded</span>
              <span className="button button-secondary">PRD next</span>
            </div>
          </div>

          <aside className="hero-card" aria-label="Initial tracks">
            <p className="card-label">Initial tracks</p>
            <div className="memory-modes">
              {tracks.map((track) => (
                <section className="memory-mode" key={track.title}>
                  <h3>{track.title}</h3>
                  <p>{track.description}</p>
                </section>
              ))}
            </div>

            <div className="status-strip">
              <strong>Current status</strong>
              <span>repo initialized, placeholder UI ready, waiting for PRD.</span>
            </div>
          </aside>
        </section>

        <section className="grid-section">
          <section className="panel">
            <h2>Project scope</h2>
            <ul>
              {scopeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Core principles</h2>
            <ul>
              {principles.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Next steps</h2>
            <ul>
              {nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>

        <p className="footer-note">
          This is the starting shell only. The actual training flow, map data model,
          and review loop will be locked in after the PRD discussion.
        </p>
      </div>
    </main>
  )
}

export default App
