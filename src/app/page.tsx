import LoginForm from "@/components/auth/LoginForm";
import { GraduationCap, BookOpen, Users, Award } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Welcome Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center p-8 lg:p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-white/5 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:60px_60px]"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">
              HeyPeter Academy
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Advanced Language Learning Management System
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Smart Course Management</h3>
                <p className="text-sm text-blue-200">Comprehensive curriculum tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Student & Teacher Portal</h3>
                <p className="text-sm text-blue-200">Unified learning ecosystem</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Performance Analytics</h3>
                <p className="text-sm text-blue-200">Data-driven insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your academy dashboard</p>
            </div>
            
            <LoginForm />
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 HeyPeter Academy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
