"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ForgotPasswordFormProps {
  onBackToLoginClick: () => void
}

export function ForgotPasswordForm({ onBackToLoginClick }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Password reset request for:", email)
  }

  return (
    <div className="fixed inset-0 bg-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Forgotten your password?</h1>
          <p className="text-sm text-gray-600">
            There is nothing to worry about, we'll send you a message to help you reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter personal or work email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
            />
          </div>

          <Button type="submit" className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md">
            Send Reset Link
          </Button>
        </form>
      </div>
    </div>
  )
}
