// cadastro.js
// Validação e processamento do formulário de cadastro

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');
    const erroEl = document.getElementById('erro-cadastro');

    if (!form) {
        console.error('Formulário #form-cadastro não encontrado.');
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // impede o envio padrão até validar

        const nome = document.getElementById('nome').value.trim();
        const dataNsc = document.getElementById('data-nsc').value;
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const senhaConfirma = document.getElementById('senha-confirma').value;

        const erro = validarCadastro({ nome, dataNsc, email, senha, senhaConfirma });

        if (erro) {
            mostrarErro(erro);
            return;
        }

        // Verifica se o e-mail já está cadastrado
        const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
        const jaExiste = usuarios.some(u => u.email.toLowerCase() === email.toLowerCase());

        if (jaExiste) {
            mostrarErro('Este e-mail já está cadastrado.');
            return;
        }

        // Salva o novo usuário (em produção, isso iria para um backend real)
        const novoUsuario = { nome, dataNsc, email, senha };
        usuarios.push(novoUsuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));

        // Guarda o usuário "logado" para a próxima página usar
        localStorage.setItem('usuarioLogado', JSON.stringify({ nome, email }));

        // Redireciona para o perfil
        window.location.href = form.getAttribute('action') || 'perfil.html';
    });

    function validarCadastro({ nome, dataNsc, email, senha, senhaConfirma }) {
        if (!nome) {
            return 'Por favor, preencha o nome completo.';
        }

        if (nome.trim().split(' ').filter(Boolean).length < 2) {
            return 'Informe seu nome completo (nome e sobrenome).';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Digite um e-mail válido.';
        }

        if (dataNsc) {
            const idade = calcularIdade(dataNsc);
            if (idade < 13) {
                return 'Você precisa ter pelo menos 13 anos para se cadastrar.';
            }
            if (idade > 110) {
                return 'Data de nascimento inválida.';
            }
        }

        if (senha.length < 6) {
            return 'A senha deve ter pelo menos 6 caracteres.';
        }

        if (senha !== senhaConfirma) {
            return 'As senhas não coincidem.';
        }

        return null; // sem erros
    }

    function calcularIdade(dataNascimento) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    }

    function mostrarErro(mensagem) {
        if (erroEl) {
            erroEl.textContent = mensagem;
            erroEl.style.display = 'block';
        } else {
            alert(mensagem);
        }
    }
});