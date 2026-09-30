// Menghubungkan <label class="form-label"> dengan kolom isian di dalam .form-group yang sama,
// supaya pembaca layar membacakan nama kolom dan mengetuk label memfokuskan kolomnya.
let counter = 0;

const CONTROLS = 'input:not([type=hidden]), select, textarea';

export function linkFormLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLLabelElement>('label.form-label:not([for]), .form-group > label:not([for])').forEach(label => {
    // Label yang membungkus kolom sendiri sudah terhubung
    if (label.querySelector(CONTROLS)) return;

    // Cari kolom di dalam .form-group yang sama; kalau tidak ada .form-group,
    // pakai kolom satu-satunya di induk label (hanya bila tidak ambigu).
    const group = label.closest('.form-group');
    let control: HTMLElement | null = null;
    if (group) {
      control = group.querySelector<HTMLElement>(CONTROLS);
    } else if (label.parentElement) {
      const inParent = label.parentElement.querySelectorAll<HTMLElement>(CONTROLS);
      if (inParent.length === 1) control = inParent[0];
    }
    if (!control) return;

    if (!control.id) control.id = `f-${++counter}`;
    label.htmlFor = control.id;
  });
}

// Pantau perubahan halaman (modal dibuka, daftar berubah) dan hubungkan label yang baru muncul
export function watchFormLabels(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    timer = null;
    linkFormLabels();
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(run, 50);
  };

  linkFormLabels();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
  };
}
