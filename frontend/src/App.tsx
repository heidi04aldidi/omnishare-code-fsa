import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'omni_token';
const USER_KEY = 'omni_user';

type Role = 'USER' | 'ADMIN';
type User = { id: string; name: string; email: string; role: Role };
type Asset = {
  id: string;
  name: string;
  state: 'AVAILABLE' | 'RESERVED' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  usageCount: number;
};
type Booking = {
  id: string;
  status: 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  user: User;
  asset: Asset;
  startAt: string;
  endAt: string;
};
type Ticket = { id: string; reason: string; asset: Asset };
type AuthResponse = { accessToken: string; user: User };

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string>),
  };
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...init,
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json() as Promise<T>;
}

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assetName, setAssetName] = useState('');
  const [userId, setUserId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const refresh = async () => {
    if (!token || !currentUser) return;
    try {
      const [assetsRes, bookingsRes] = await Promise.all([
        api<Asset[]>('/assets', token),
        api<Booking[]>('/bookings', token),
      ]);
      setAssets(assetsRes);
      setBookings(bookingsRes);

      if (isAdmin) {
        const [usersRes, ticketsRes] = await Promise.all([
          api<User[]>('/users', token),
          api<Ticket[]>('/maintenance', token),
        ]);
        setUsers(usersRes);
        setTickets(ticketsRes);
      } else {
        setUsers([currentUser]);
        setTickets([]);
      }
      setError('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout('Session expired. Please login again.');
        return;
      }
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token, currentUser?.id, currentUser?.role, isAdmin]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    const path = authMode === 'register' ? '/auth/register' : '/auth/login';
    const payload =
      authMode === 'register'
        ? { name: authName, email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword };

    try {
      const auth = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!auth.ok) throw new Error(await auth.text());
      const data = (await auth.json()) as AuthResponse;
      setToken(data.accessToken);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setError('');
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const logout = (message?: string) => {
    setToken('');
    setCurrentUser(null);
    setUsers([]);
    setAssets([]);
    setBookings([]);
    setTickets([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (message) setError(message);
    navigate('/login');
  };

  const callApi = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    try {
      return await api<T>(path, token, init);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout('Session expired. Please login again.');
      }
      throw err;
    }
  };

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    await callApi('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setName('');
    setEmail('');
    setPassword('');
    await refresh();
  };

  const createAsset = async (e: FormEvent) => {
    e.preventDefault();
    await callApi('/assets', {
      method: 'POST',
      body: JSON.stringify({ name: assetName }),
    });
    setAssetName('');
    await refresh();
  };

  const createBooking = async (e: FormEvent) => {
    e.preventDefault();
    await callApi('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        userId: isAdmin ? userId : currentUser?.id,
        assetId,
        startAt,
        endAt,
      }),
    });
    await refresh();
  };

  const promoteToAdmin = async (targetUserId: string) => {
    await callApi(`/users/${targetUserId}/promote-admin`, { method: 'PATCH' });
    await refresh();
  };

  const loginPage = (
    <main className="page auth-page">
      <h1>OmniShare Login</h1>
      <p className="sub">Sign in to manage bookings and assets securely.</p>
      {error && <p className="error">{error}</p>}
      <article className="card auth-card">
        <div className="auth-switch">
          <button type="button" onClick={() => setAuthMode('register')}>
            Register
          </button>
          <button type="button" onClick={() => setAuthMode('login')}>
            Login
          </button>
        </div>
        <form onSubmit={handleAuth}>
          {authMode === 'register' && (
            <input
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder="Full name"
              required
            />
          )}
          <input
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <input
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
          />
          <button type="submit">
            {authMode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </article>
    </main>
  );

  const dashboardPage = (
    <main className="page">
      <div className="topbar">
        <p>
          Signed in as <strong>{currentUser?.email}</strong> ({currentUser?.role})
        </p>
        <button onClick={() => logout()}>Logout</button>
      </div>
      <h1>OmniShare: Circular Economy Asset Engine</h1>
      <p className="sub">
        State-driven assets, safety-gated bookings, conflict-free scheduling, and
        proactive maintenance workflows.
      </p>
      {error && <p className="error">{error}</p>}

      <section className="grid">
        {isAdmin && (
          <article className="card">
            <h2>Create User (Admin)</h2>
            <form onSubmit={createUser}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                minLength={8}
                required
              />
              <button type="submit">Add User</button>
            </form>
          </article>
        )}

        {isAdmin && (
          <article className="card">
            <h2>Create Asset (Admin)</h2>
            <form onSubmit={createAsset}>
              <input
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Asset name"
                required
              />
              <button type="submit">Add Asset</button>
            </form>
          </article>
        )}

        <article className="card">
          <h2>Create Booking</h2>
          <form onSubmit={createBooking}>
            {isAdmin && (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
            >
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.state})
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
            <button type="submit">Book Asset</button>
          </form>
        </article>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Assets</h2>
          <ul>
            {assets.map((asset) => (
              <li key={asset.id}>
                <span>
                  {asset.name} - {asset.state} - uses: {asset.usageCount}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Bookings</h2>
          <ul>
            {bookings.map((booking) => (
              <li key={booking.id}>
                <span>
                  {booking.asset.name} by {booking.user.name} ({booking.status})
                </span>
                {booking.status === 'RESERVED' && (
                  <button
                    onClick={async () => {
                      await callApi(`/bookings/${booking.id}/start`, {
                        method: 'PATCH',
                      });
                      await refresh();
                    }}
                  >
                    Start
                  </button>
                )}
                {booking.status === 'ACTIVE' && (
                  <button
                    onClick={async () => {
                      await callApi(`/bookings/${booking.id}/complete`, {
                        method: 'PATCH',
                      });
                      await refresh();
                    }}
                  >
                    Complete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>

        {isAdmin ? (
          <article className="card">
            <h2>Maintenance Queue</h2>
            <ul>
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <span>
                    {ticket.asset.name}: {ticket.reason}
                  </span>
                  <button
                    onClick={async () => {
                      await callApi(`/maintenance/${ticket.id}/resolve`, {
                        method: 'PATCH',
                      });
                      await refresh();
                    }}
                  >
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ) : (
          <article className="card">
            <h2>Maintenance Queue</h2>
            <p>Visible to admins only.</p>
          </article>
        )}
      </section>

      {isAdmin && (
        <section className="grid">
          <article className="card">
            <h2>Promote User to Admin</h2>
            <ul>
              {users
                .filter((u) => u.role !== 'ADMIN')
                .map((u) => (
                  <li key={u.id}>
                    <span>
                      {u.name} ({u.email})
                    </span>
                    <button onClick={() => void promoteToAdmin(u.id)}>Promote</button>
                  </li>
                ))}
            </ul>
          </article>
        </section>
      )}
    </main>
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={token && currentUser ? <Navigate to="/dashboard" replace /> : loginPage}
      />
      <Route
        path="/dashboard"
        element={token && currentUser ? dashboardPage : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={token && currentUser ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
