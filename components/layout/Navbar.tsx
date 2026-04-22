'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { signOut } from '@/lib/supabase/auth'
import toast from 'react-hot-toast'
import { Menu, X, Home, PlusCircle, LayoutDashboard, Shield, LogOut, LogIn, UserPlus, Sparkles, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Navbar() {
  const { user, loading, refreshUser } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    await refreshUser()
    toast.success('Signed out successfully')
    router.push('/')
    router.refresh()
    setUserDropdownOpen(false)
  }

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-gradient-to-r from-red-500 to-red-600'
      case 'author': return 'bg-gradient-to-r from-green-500 to-emerald-600'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600'
    }
  }

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin': return <Shield className="w-3 h-3" />
      case 'author': return <PlusCircle className="w-3 h-3" />
      default: return <Sparkles className="w-3 h-3" />
    }
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/posts/create', label: 'Write', icon: PlusCircle, roles: ['author', 'admin'] },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['author', 'admin'] },
    { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] },
  ]

  const visibleLinks = navLinks.filter(link => {
    if (!link.roles) return true
    if (!user) return false
    return link.roles.includes(user.role)
  })

  const isActive = (href: string) => pathname === href

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                href="/" 
                className="flex items-center space-x-2 group"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  BlogPlatform
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {visibleLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : ''}`} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* User Menu - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {!loading && (
                <>
                  {user ? (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200"
                      >
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                          <div className="flex items-center space-x-1">
                            {getRoleIcon()}
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getRoleBadgeColor()}`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {userDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fadeIn">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Signed in</p>
                          </div>
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Dashboard</span>
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Link
                        href="/auth/signin"
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Sign Up</span>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white/95 backdrop-blur-md animate-slideIn">
          <div className="flex flex-col h-full pt-20 pb-6 px-4">
            {/* User Info Mobile */}
            {!loading && user && (
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <span className={`inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full text-white ${getRoleBadgeColor()}`}>
                    {getRoleIcon()}
                    <span>{user.role}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Nav Links Mobile */}
            <div className="space-y-1">
              {visibleLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : ''}`} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Auth Buttons Mobile */}
            {!loading && !user && (
              <div className="mt-4 space-y-2">
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-base font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}

            {/* Sign Out Button Mobile */}
            {!loading && user && (
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center space-x-2 px-4 py-3 rounded-xl text-base font-medium text-red-600 border border-red-200 hover:bg-red-50 mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}