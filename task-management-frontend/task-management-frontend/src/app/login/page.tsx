"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginRequest } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
const [showPassword, setShowPassword] = useState(false);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

   try {
    // loginRequest'ten gelen tüm bilgileri burada tek seferde karşılıyoruz
    const data = await loginRequest(username, password);

    // Hepsini tarayıcının hafızasına (localStorage) kaydediyoruz
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("mustChangePassword", data.mustChangePassword ? "true" : "false");
    
    // YENİ EKLEDİĞİMİZ BİLGİLER (Artık sağ üstte adın soyadın düzgün çıkacak)
    localStorage.setItem("fullName", data.fullName);
    localStorage.setItem("username", data.username);
    localStorage.setItem("userId", data.userId.toString());

    // Yönlendirme
    router.push(
      data.mustChangePassword ? "/sifre-belirle" : "/dashboards"
    );

} catch (err) {
    setError(err instanceof Error ? err.message : "Giriş yapılırken bir hata oluştu.");
}

   finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[46%_54%]">

      {/* =========================
          LEFT SIDE
      ========================== */}
      <aside className="relative hidden overflow-hidden bg-evergreen lg:flex lg:min-h-screen lg:flex-col">

        {/* Background pattern */}
        <RowPattern />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between px-14 py-12 xl:px-20 xl:py-14">

          {/* Logo */}
          <div className="flex items-center gap-4">

            <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-md">
              <img
                src="/logo.png"
                alt="Kayseri Şeker Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <span className="font-display text-2xl font-semibold tracking-wide text-paper xl:text-3xl">
              Kayseri Şeker
            </span>

          </div>

          {/* Hero text */}
          <div className="max-w-xl pb-4">

            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-honey">
              Kurum İçi Yönetim Platformu
            </p>

            <h1 className="font-display text-[3.5rem] leading-[1.08] text-paper xl:text-[4.3rem]">
              Görev Yönetim
              <br />
              Sistemi
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-paper/75 xl:text-lg xl:leading-8">
              Ekiplerin işlerini tek panoda takip ettiği,
              kurum içi görev ve proje yönetim platformu.
            </p>

          </div>

        </div>
      </aside>


      {/* ----sağ taraf*/}
      <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">

        <div className="w-full max-w-[520px]">

          {/* Header */}
          <div className="mb-9">

            <h2 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              Giriş yap
            </h2>

            <p className="mt-3 text-base text-ink/55 sm:text-lg">
              Kullanıcı adın ve şifrenle devam et.
            </p>

          </div>


          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
          >

            {/* Username */}
            <div>

              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-ink/75"
              >
                Kullanıcı adı
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Kullanıcı adınızı girin"
                className="
                  h-14
                  w-full
                  rounded-xl
                  border
                  border-line
                  bg-white
                  px-4
                  text-base
                  text-ink
                  outline-none
                  transition
                  placeholder:text-ink/30
                  hover:border-ink/20
                  focus:border-evergreen
                  focus:ring-4
                  focus:ring-evergreen/10
                "
              />

            </div>


            {/* Password */}
            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-ink/75"
              >
                Şifre
              </label>

              <div className="relative w-full">
                <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required
                 autoComplete="current-password"
                 placeholder="Şifrenizi girin"
                 className="
                  h-14
                 w-full
                 rounded-xl
                 border
                 border-line
                bg-white
                px-4
                pr-12
                text-base
                text-ink
               outline-none
               transition
              placeholder:text-ink/30
              hover:border-ink/20
              focus:border-evergreen
              focus:ring-4
              focus:ring-evergreen/10
            "
              />
  
  {/* Modern SVG Göz İkonu Butonu */}
  <button 
    type="button" 
    onClick={() => setShowPassword(!showPassword)} 
    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
    title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
  >
    {showPassword ? (
      /* Gözü Açık İkonu (Şifre görünüyorken) ai dan aldım */
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ) : (
      /* Gözü Kapalı / Üstü Çizili İkonu (Şifre gizliyken) ai dan aldım*/
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    )}
  </button>
</div> 

            </div>


            {/* Error */}
            {error && (
              <div
                role="alert"
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-red-600
                "
              >
                {error}
              </div>
            )}


            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-2
                h-14
                w-full
                rounded-xl
                bg-evergreen
                text-base
                font-semibold
                text-paper
                shadow-sm
                transition
                hover:bg-evergreen-dark
                hover:shadow-md
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading
                ? "Giriş yapılıyor…"
                : "Giriş yap"}
            </button>

          </form>


          {/* Footer */}
          <p className="mt-8 text-center text-sm leading-6 text-ink/45">
            Şifrenizi unuttuysanız yöneticinizle iletişime geçin.
          </p>

        </div>

      </main>

    </div>
  );
}


// ========================================
// Background Pattern

function RowPattern() {
  return (
    <svg
      className="
        pointer-events-none
        absolute
        inset-0
        h-full
        w-full
        opacity-[0.055]
      "
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {Array.from({ length: 13 }).map((_, i) => (
        <line
          key={i}
          x1={-100 + i * 45}
          y1="0"
          x2={0 + i * 45}
          y2="400"
          stroke="var(--color-honey)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}