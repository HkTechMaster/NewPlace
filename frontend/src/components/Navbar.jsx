import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const roleLabels = { super_admin:'Super Admin', dean:'Dean', chairperson:'Chairperson', coordinator:'Coordinator', placement_officer:'Placement Officer', student:'Student' };
  const roleColors = { super_admin:'gold', dean:'blue', chairperson:'green', coordinator:'green', placement_officer:'gold', student:'green' };
  const roleBadge = roleLabels[user?.role] || user?.role;
  const roleColor = roleColors[user?.role] || 'blue';

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 38,11 38,29 20,38 2,29 2,11" stroke="#3b82f6" strokeWidth="2" fill="none"/>
              <circle cx="20" cy="20" r="5" fill="#3b82f6"/>
            </svg>
          </div>
          <span className={styles.brandName}>PlacePro</span>
        </div>

        {/* Right */}
        <div className={styles.right}>
          <div className={styles.userInfo} onClick={() => setMenuOpen(!menuOpen)}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.userText}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={`${styles.roleBadge} ${styles[roleColor]}`}>{roleBadge}</span>
            </div>
            <svg className={`${styles.chevron} ${menuOpen ? styles.open : ''}`} viewBox="0 0 20 20" fill="currentColor" width="16">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          {menuOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownEmail}>{user?.email}</div>
              </div>
              <hr className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="15">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click-outside overlay */}
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
    </nav>
  );
}
