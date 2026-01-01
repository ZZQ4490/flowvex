import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Icon } from './Icon';

interface UserMenuProps {
  compact?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className={`flex items-center justify-center gap-2 rounded-lg transition-colors ${
          compact 
            ? 'p-2.5 text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
            : 'px-4 py-2 bg-primary-600 text-white hover:bg-primary-700'
        }`}
        title={compact ? '登录' : undefined}
      >
        <Icon name="LogIn" size={compact ? 20 : 18} />
        {!compact && '登录'}
      </button>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/auth');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg transition-colors ${
          compact 
            ? 'p-1.5 hover:bg-white/[0.06]' 
            : 'p-1.5 hover:bg-white/[0.06] w-full'
        }`}
        title={compact ? user.name : undefined}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className={`rounded-full object-cover ${compact ? 'w-8 h-8' : 'w-8 h-8'}`}
          />
        ) : (
          <div className={`rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium ${
            compact ? 'w-8 h-8' : 'w-8 h-8'
          }`}>
            {getInitials(user.name)}
          </div>
        )}
        {!compact && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <Icon 
              name="ChevronDown" 
              size={16} 
              className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 ${
          compact ? 'left-full ml-2 bottom-0' : 'bottom-full mb-2 left-0'
        }`}>
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
              {user.role === 'admin' ? '管理员' : user.role === 'manager' ? '管理者' : '用户'}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <Icon name="User" size={16} className="text-gray-400" />
              个人资料
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <Icon name="Settings" size={16} className="text-gray-400" />
              设置
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
            >
              <Icon name="LogOut" size={16} />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
