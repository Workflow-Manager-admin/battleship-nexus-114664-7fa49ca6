import React, { useState } from "react";

// PUBLIC_INTERFACE
/**
 * Signup page for new account creation.
 */
function SignupPage({ onSignup, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSignup(username, password);
  }

  return (
    <div className="container">
      <h2>Sign Up</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-large">Create Account</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
export default SignupPage;
