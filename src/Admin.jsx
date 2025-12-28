import { useState, useEffect } from 'react';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [mortgageRates, setMortgageRates] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    totalUsers: 0,
    totalFeedback: 0
  });

  // New team member form state
  const [newMember, setNewMember] = useState({
    name: '',
    position: '',
    bio: '',
    email: '',
    phone: '',
    image: ''
  });

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          await fetchStats();
          break;
        case 'appointments':
          await fetchAppointments();
          break;
        case 'team':
          await fetchTeamMembers();
          break;
        case 'rates':
          await fetchMortgageRates();
          break;
        case 'feedback':
          await fetchFeedback();
          break;
        case 'users':
          await fetchUsers();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [appointmentsRes, usersRes, feedbackRes] = await Promise.all([
        fetch(`${API_URL}/api/appointments`),
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/feedback`)
      ]);

      const appointmentsData = await appointmentsRes.json();
      const usersData = await usersRes.json();
      const feedbackData = await feedbackRes.json();

      setStats({
        totalAppointments: appointmentsData.length,
        pendingAppointments: appointmentsData.filter(a => a.status === 'pending').length,
        totalUsers: usersData.length,
        totalFeedback: feedbackData.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAppointments = async () => {
    const response = await fetch(`${API_URL}/api/appointments`);
    const data = await response.json();
    setAppointments(data);
  };

  const fetchTeamMembers = async () => {
    const response = await fetch(`${API_URL}/api/team`);
    const data = await response.json();
    setTeamMembers(data);
  };

  const fetchMortgageRates = async () => {
    const response = await fetch(`${API_URL}/api/mortgage-rates`);
    const data = await response.json();
    setMortgageRates(data);
  };

  const fetchFeedback = async () => {
    const response = await fetch(`${API_URL}/api/feedback`);
    const data = await response.json();
    setFeedback(data);
  };

  const fetchUsers = async () => {
    const response = await fetch(`${API_URL}/api/users`);
    const data = await response.json();
    setUsers(data);
  };

  const handleAppointmentStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchAppointments();
        alert('Appointment status updated successfully');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const response = await fetch(`${API_URL}/api/appointments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAppointments();
        alert('Appointment deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  };

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });

      if (response.ok) {
        setNewMember({ name: '', position: '', bio: '', email: '', phone: '', image: '' });
        fetchTeamMembers();
        alert('Team member added successfully');
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member');
    }
  };

  const handleDeleteTeamMember = async (id) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const response = await fetch(`${API_URL}/api/team/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTeamMembers();
        alert('Team member deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      alert('Failed to delete team member');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`${API_URL}/api/feedback/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchFeedback();
        alert('Feedback deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-container">
      <h2>Dashboard Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats.totalAppointments}</h3>
            <p>Total Appointments</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pendingAppointments}</h3>
            <p>Pending Appointments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Registered Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-info">
            <h3>{stats.totalFeedback}</h3>
            <p>Feedback Received</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="appointments-container">
      <h2>Manage Appointments</h2>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Message</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment._id}>
                <td>{new Date(appointment.date).toLocaleDateString()}</td>
                <td>{appointment.name}</td>
                <td>{appointment.email}</td>
                <td>{appointment.phone}</td>
                <td className="message-cell">{appointment.message}</td>
                <td>
                  <span className={`status-badge ${appointment.status}`}>
                    {appointment.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <select
                      value={appointment.status}
                      onChange={(e) => handleAppointmentStatus(appointment._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDeleteAppointment(appointment._id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="team-container">
      <h2>Team Management</h2>
      
      <div className="add-member-form">
        <h3>Add New Team Member</h3>
        <form onSubmit={handleAddTeamMember}>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Position"
              value={newMember.position}
              onChange={(e) => setNewMember({ ...newMember, position: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Phone"
              value={newMember.phone}
              onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Image URL"
              value={newMember.image}
              onChange={(e) => setNewMember({ ...newMember, image: e.target.value })}
            />
            <textarea
              placeholder="Bio"
              value={newMember.bio}
              onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
              required
              className="full-width"
            />
          </div>
          <button type="submit" className="submit-btn">Add Team Member</button>
        </form>
      </div>

      <div className="team-grid">
        {teamMembers.map((member) => (
          <div key={member._id} className="team-card">
            <img src={member.image || '/placeholder.jpg'} alt={member.name} />
            <h3>{member.name}</h3>
            <p className="position">{member.position}</p>
            <p className="bio">{member.bio}</p>
            <p className="contact">📧 {member.email}</p>
            <p className="contact">📞 {member.phone}</p>
            <button
              onClick={() => handleDeleteTeamMember(member._id)}
              className="delete-btn"
            >
              Delete Member
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRates = () => (
    <div className="rates-container">
      <h2>Mortgage Rates</h2>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Lender</th>
              <th>Product</th>
              <th>Rate</th>
              <th>APR</th>
              <th>Term</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {mortgageRates.map((rate) => (
              <tr key={rate._id}>
                <td>{rate.lender}</td>
                <td>{rate.product}</td>
                <td className="rate-value">{rate.rate}%</td>
                <td>{rate.apr}%</td>
                <td>{rate.term}</td>
                <td>{new Date(rate.lastUpdated).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="feedback-container">
      <h2>Customer Feedback</h2>
      <div className="feedback-grid">
        {feedback.map((item) => (
          <div key={item._id} className="feedback-card">
            <div className="feedback-header">
              <div>
                <h3>{item.name}</h3>
                <p className="feedback-email">{item.email}</p>
              </div>
              <div className="rating">
                {'⭐'.repeat(item.rating || 5)}
              </div>
            </div>
            <p className="feedback-message">{item.message}</p>
            <div className="feedback-footer">
              <span className="feedback-date">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleDeleteFeedback(item._id)}
                className="delete-btn-small"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="users-container">
      <h2>Registered Users</h2>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone || 'N/A'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h1>Admin Panel</h1>
        </div>
        <nav className="admin-nav">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={activeTab === 'appointments' ? 'active' : ''}
            onClick={() => setActiveTab('appointments')}
          >
            <span className="nav-icon">📅</span>
            Appointments
          </button>
          <button
            className={activeTab === 'team' ? 'active' : ''}
            onClick={() => setActiveTab('team')}
          >
            <span className="nav-icon">👥</span>
            Team
          </button>
          <button
            className={activeTab === 'rates' ? 'active' : ''}
            onClick={() => setActiveTab('rates')}
          >
            <span className="nav-icon">💰</span>
            Mortgage Rates
          </button>
          <button
            className={activeTab === 'feedback' ? 'active' : ''}
            onClick={() => setActiveTab('feedback')}
          >
            <span className="nav-icon">💬</span>
            Feedback
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            <span className="nav-icon">🔐</span>
            Users
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          <div className="admin-user">
            <span>Admin User</span>
            <div className="user-avatar">A</div>
          </div>
        </header>

        <div className="admin-content">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'appointments' && renderAppointments()}
              {activeTab === 'team' && renderTeam()}
              {activeTab === 'rates' && renderRates()}
              {activeTab === 'feedback' && renderFeedback()}
              {activeTab === 'users' && renderUsers()}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
