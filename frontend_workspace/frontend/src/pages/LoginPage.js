import React, { useState } from "react";

// PUBLIC_INTERFACE
/**
 * Login page for user authentication.
 */
function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onLogin(username, password);
  }

  return (
    <div className="container">
      <h2>Login</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          required
          autoFocus
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-large">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
export default LoginPage;
