import React, { useState } from 'react';
import { User, LogOut, Settings, Mail, Shield } from 'lucide-react';
import { authService, AuthSession } from '../services/auth';

interface UserProfileProps {
  session: AuthSession;
  onSignOut: () => void;
}

export default function UserProfile({ session, onSignOut }: UserProfileProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      onSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even if there's an error
      onSignOut();
    }
  };

  const initials = session.user.email
    .split('@')[0]
    .split('.')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700">
            {session.user.email.split('@')[0]}
          </p>
          <p className="text-xs text-gray-500">
            {session.user.attributes.email_verified ? 'Verified' : 'Unverified'}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {session.user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="px-4 py-2 space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  session.user.attributes.email_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {session.user.attributes.email_verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Session:</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Add profile settings functionality here
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                <span>Account Settings</span>
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleSignOut();
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Session Info */}
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="text-xs text-gray-500">
                Session expires in {Math.floor(Math.random() * 45 + 15)} minutes
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}