import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import styles from "../styles/Home.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(error.message);
    } else {
      // Login bem-sucedido
      sessionStorage.setItem("logado", "true");
      router.push("/");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🔒 Login</h1>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha:
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p style={{ color: "red" }}>{erro}</p>}
        <button type="submit" className={`${styles.button} ${styles.saveButton}`}>
          Entrar
        </button>
      </form>
    </div>
  );
}
