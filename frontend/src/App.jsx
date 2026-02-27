import { useEffect, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import { api, APP_BASE } from './api'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pages', label: 'Pages' },
  { key: 'posts', label: 'Posts' },
  { key: 'banners', label: 'Banners', adminOnly: true },
  { key: 'menus', label: 'Menus', adminOnly: true },
  { key: 'media', label: 'Media Library' },
  { key: 'users', label: 'Users', adminOnly: true },
]

const initialContentForm = { title: '', slug: '', body: '', status: 'draft' }

function LoginView({ onLogin, error }) {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin123' })

  const submit = async (e) => {
    e.preventDefault()
    onLogin(credentials)
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={submit}>
        <h1>CMS Admin Login</h1>
        <p className="hint">Default admin: admin / admin123</p>
        <label>
          Username
          <input
            value={credentials.username}
            onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign in</button>
      </form>
    </div>
  )
}

function Dashboard({ stats }) {
  return (
    <div className="grid">
      {Object.entries(stats).map(([label, value]) => (
        <div key={label} className="stat">
          <h3>{label}</h3>
          <p>{value}</p>
        </div>
      ))}
    </div>
  )
}

function ContentManager({ type }) {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialContentForm)

  const load = async () => {
    const { data } = await api.get(`/${type}`)
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [type])

  const reset = () => {
    setEditingId(null)
    setForm(initialContentForm)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (editingId) {
      await api.put(`/${type}/${editingId}`, form)
    } else {
      await api.post(`/${type}`, form)
    }
    reset()
    load()
  }

  const remove = async (id) => {
    await api.delete(`/${type}/${id}`)
    if (editingId === id) reset()
    load()
  }

  const edit = (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      slug: item.slug,
      body: item.body,
      status: item.status,
    })
  }

  return (
    <div className="split">
      <form className="card" onSubmit={submit}>
        <h2>{editingId ? `Edit ${type.slice(0, -1)}` : `Create ${type.slice(0, -1)}`}</h2>
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            required
          />
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          Body
          <ReactQuill value={form.body} onChange={(value) => setForm((prev) => ({ ...prev, body: value }))} />
        </label>
        <div className="actions">
          <button type="submit">{editingId ? 'Update' : 'Create'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h2>{type}</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.slug}</td>
                <td>{item.status}</td>
                <td>
                  <button onClick={() => edit(item)}>Edit</button>
                  <button className="danger" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BannersManager() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', is_active: true })

  const load = async () => {
    const { data } = await api.get('/banners')
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const payload = { ...form, is_active: form.is_active ? 1 : 0 }
    if (editingId) {
      await api.put(`/banners/${editingId}`, payload)
    } else {
      await api.post('/banners', payload)
    }
    setEditingId(null)
    setForm({ title: '', image_url: '', link_url: '', is_active: true })
    load()
  }

  const edit = (item) => {
    setEditingId(item.id)
    setForm({ ...item, is_active: Boolean(item.is_active) })
  }

  const remove = async (id) => {
    await api.delete(`/banners/${id}`)
    load()
  }

  return (
    <div className="split">
      <form className="card" onSubmit={submit}>
        <h2>{editingId ? 'Edit Banner' : 'Create Banner'}</h2>
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Image URL
          <input
            value={form.image_url}
            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
          />
        </label>
        <label>
          Link URL
          <input
            value={form.link_url}
            onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
          />
          Active
        </label>
        <button type="submit">{editingId ? 'Update' : 'Create'}</button>
      </form>

      <div className="card">
        <h2>Banners</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Image</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.image_url}</td>
                <td>{item.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <button onClick={() => edit(item)}>Edit</button>
                  <button className="danger" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MenusManager() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', itemsText: '[{"label":"Home","url":"/"}]' })
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await api.get('/menus')
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      const parsedItems = JSON.parse(form.itemsText)
      const payload = { name: form.name, items: parsedItems }
      if (editingId) {
        await api.put(`/menus/${editingId}`, payload)
      } else {
        await api.post('/menus', payload)
      }
      setEditingId(null)
      setForm({ name: '', itemsText: '[{"label":"Home","url":"/"}]' })
      setError('')
      load()
    } catch {
      setError('Menu items must be valid JSON array')
    }
  }

  const edit = (item) => {
    setEditingId(item.id)
    setForm({ name: item.name, itemsText: JSON.stringify(item.items, null, 2) })
  }

  const remove = async (id) => {
    await api.delete(`/menus/${id}`)
    load()
  }

  return (
    <div className="split">
      <form className="card" onSubmit={submit}>
        <h2>{editingId ? 'Edit Menu' : 'Create Menu'}</h2>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Items JSON
          <textarea
            rows={10}
            value={form.itemsText}
            onChange={(e) => setForm((prev) => ({ ...prev, itemsText: e.target.value }))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{editingId ? 'Update' : 'Create'}</button>
      </form>

      <div className="card">
        <h2>Menus</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.items.length}</td>
                <td>
                  <button onClick={() => edit(item)}>Edit</button>
                  <button className="danger" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MediaLibrary() {
  const [media, setMedia] = useState([])
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    const { data } = await api.get('/media')
    setMedia(data)
  }

  useEffect(() => {
    load()
  }, [])

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    await api.post('/media/upload', formData)
    setUploading(false)
    e.target.value = ''
    load()
  }

  const remove = async (id) => {
    await api.delete(`/media/${id}`)
    load()
  }

  return (
    <div className="card">
      <div className="actions between">
        <h2>Media Library</h2>
        <label className="upload">
          Upload
          <input type="file" onChange={uploadFile} />
        </label>
      </div>
      {uploading && <p className="hint">Uploading...</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size (bytes)</th>
            <th>Preview</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {media.map((item) => (
            <tr key={item.id}>
              <td>{item.original_name}</td>
              <td>{item.mime_type}</td>
              <td>{item.file_size}</td>
              <td>
                <a href={`${APP_BASE}${item.file_url}`} target="_blank" rel="noreferrer">
                  Open
                </a>
              </td>
              <td>
                <button className="danger" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserCreator() {
  const [form, setForm] = useState({ username: '', password: '', role: 'editor' })
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    await api.post('/users', form)
    setForm({ username: '', password: '', role: 'editor' })
    setMessage('User created')
  }

  return (
    <form className="card small" onSubmit={submit}>
      <h2>Create User</h2>
      <label>
        Username
        <input
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
        />
      </label>
      <label>
        Role
        <select
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button type="submit">Create user</button>
      {message && <p className="hint">{message}</p>}
    </form>
  )
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('cms_token') || '')
  const [user, setUser] = useState(null)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [stats, setStats] = useState({ pages: 0, posts: 0, banners: 0, menus: 0, media: 0 })
  const [authError, setAuthError] = useState('')
  const [requestError, setRequestError] = useState('')

  const visibleNav = useMemo(() => {
    return NAV_ITEMS.filter((item) => (item.adminOnly ? user?.role === 'admin' : true))
  }, [user])

  const fetchMe = async () => {
    const { data } = await api.get('/auth/me')
    setUser(data.user)
  }

  const fetchDashboard = async () => {
    const { data } = await api.get('/dashboard')
    setStats(data)
  }

  useEffect(() => {
    if (!token) return
    Promise.all([fetchMe(), fetchDashboard()]).catch(() => {
      logout()
    })
  }, [token])

  const login = async (credentials) => {
    setAuthError('')
    try {
      const { data } = await api.post('/auth/login', credentials)
      localStorage.setItem('cms_token', data.token)
      setToken(data.token)
      setUser(data.user)
    } catch (error) {
      setAuthError(error?.response?.data?.message || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('cms_token')
    setToken('')
    setUser(null)
    setActiveNav('dashboard')
  }

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        setRequestError(error?.response?.data?.message || 'Request failed')
        if (error?.response?.status === 401) {
          logout()
        }
        return Promise.reject(error)
      },
    )

    return () => api.interceptors.response.eject(interceptor)
  }, [])

  if (!token || !user) {
    return <LoginView onLogin={login} error={authError} />
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>CMS</h2>
        <p className="hint">{user.username} ({user.role})</p>
        {visibleNav.map((item) => (
          <button
            key={item.key}
            className={`nav-btn ${activeNav === item.key ? 'active' : ''}`}
            onClick={() => {
              setRequestError('')
              setActiveNav(item.key)
              fetchDashboard()
            }}
          >
            {item.label}
          </button>
        ))}
        <button className="secondary" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        {requestError && <p className="error">{requestError}</p>}
        {activeNav === 'dashboard' && <Dashboard stats={stats} />}
        {activeNav === 'pages' && <ContentManager type="pages" />}
        {activeNav === 'posts' && <ContentManager type="posts" />}
        {activeNav === 'banners' && user.role === 'admin' && <BannersManager />}
        {activeNav === 'menus' && user.role === 'admin' && <MenusManager />}
        {activeNav === 'media' && <MediaLibrary />}
        {activeNav === 'users' && user.role === 'admin' && <UserCreator />}
      </main>
    </div>
  )
}

export default App
