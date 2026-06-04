import Swal from 'sweetalert2';

export async function confirmar(
  texto: string,
  opciones?: { titulo?: string; peligro?: boolean; btnConfirmar?: string }
): Promise<boolean> {
  const esPeligro = opciones?.peligro ?? false;
  const result = await Swal.fire({
    title: opciones?.titulo ?? (esPeligro ? '¿Eliminar?' : '¿Confirmar acción?'),
    html: texto,
    icon: esPeligro ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonColor: esPeligro ? '#ef4444' : '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: opciones?.btnConfirmar ?? (esPeligro ? 'Sí, eliminar' : 'Sí, confirmar'),
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: esPeligro,
  });
  return result.isConfirmed;
}
