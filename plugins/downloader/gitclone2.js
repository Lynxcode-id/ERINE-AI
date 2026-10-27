import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import * as settingsModule from '../../settings.js'
import { githubDownloader } from '../../scrape/githubdl.js'

const settings =
  settingsModule.default ??
  settingsModule.config ??
  settingsModule

function getWaitText() {
  const candidates = [
    settings?.messages?.wait,
    settings?.message?.wait,
    settings?.text?.wait,
    settings?.texts?.wait,
    settings?.waitMessage,
    settings?.wait,
  ]

  return candidates.find(
    value => typeof value === 'string' && value.trim()
  ) || '🌱 Elyra sedang memproses permintaan kamu, tunggu sebentar...'
}

export default {
  command: 'gitclone2',
  category: 'downloader',
  description: 'Mengunduh source code repository GitHub dalam format ZIP.',
  help: '<url atau owner/repo>',
  typing: true,
  wait: false,

  async execute(m, { sock, args = [] }) {
    const typed = Array.isArray(args)
      ? args.join(' ').trim()
      : String(args || '').trim()

    const quotedText = String(
      m.quoted?.text ||
      m.quoted?.caption ||
      m.quoted?.body ||
      ''
    ).trim()

    const input = typed || quotedText
    const prefix = m.prefix || '.'
    const command = m.command || 'gitclone'

    if (!input) {
      return m.reply(
        '🌷 *ELYRA — GITHUB DOWNLOADER*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        'Unduh source code repository GitHub sebagai file ZIP.\n\n' +
        '✦ *Contoh penggunaan*\n' +
        `› ${prefix}${command} https://github.com/owner/repo\n` +
        `› ${prefix}${command} owner/repo\n` +
        `› ${prefix}${command} https://github.com/owner/repo/tree/main\n\n` +
        'Kamu juga bisa membalas pesan yang berisi link GitHub.\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '© ELYRA-AI'
      )
    }

    const started = performance.now()
    let outputStream

    try {
      await m.reply(getWaitText())

      const result = await githubDownloader(input, {
        outDir: path.resolve(process.cwd(), 'downloads'),
        save: true,
      })

      if (!result.status) {
        console.error(
          '[GITCLONE] Scraper gagal:',
          result.error || result.message
        )

        return m.reply(
          '🍂 *GITHUB DOWNLOADER GAGAL*\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          `› Repository: ${
            result.owner && result.repo
              ? `${result.owner}/${result.repo}`
              : 'Tidak diketahui'
          }\n` +
          `› Pesan: ${String(
            result.error ||
            result.message ||
            'Gagal mengambil repository.'
          ).slice(0, 900)}\n` +
          '━━━━━━━━━━━━━━━━━━\n' +
          'Periksa URL repository, branch, dan akses repository.\n' +
          '© ELYRA-AI'
        )
      }

      if (
        !result.filePath ||
        !fs.existsSync(result.filePath)
      ) {
        throw new Error(
          'Arsip ZIP tidak ditemukan setelah proses download.'
        )
      }

      outputStream = result.fileStream
        ? result.fileStream()
        : fs.createReadStream(result.filePath)

      const lines = [
        '📦 *GITHUB DOWNLOADER — ELYRA*',
        '━━━━━━━━━━━━━━━━━━',
        `› Repository: ${result.owner}/${result.repo}`,
        `› Branch: ${result.branch || 'unknown'}`,
        `› Ukuran ZIP: ${result.fileSize || 'Tidak diketahui'}`,
      ]

      if (result.fileId) {
        lines.push(`› Repository ID: ${result.fileId}`)
      }

      if (typeof result.stars === 'number') {
        lines.push(`› Stars: ${result.stars}`)
      }

      if (result.description) {
        lines.push(
          `› Deskripsi: ${String(result.description).slice(0, 220)}`
        )
      }

      if (result.structure) {
        if (Number.isFinite(result.structure.totalFiles)) {
          lines.push(
            `› Total file: ${result.structure.totalFiles}`
          )
        }

        if (Number.isFinite(result.structure.totalFolders)) {
          lines.push(
            `› Total folder: ${result.structure.totalFolders}`
          )
        }

        if (result.structure.sourceSize) {
          lines.push(
            `› Ukuran source: ${result.structure.sourceSize}`
          )
        }

        if (result.structure.truncated) {
          lines.push(
            '› Catatan: struktur repository dipotong oleh GitHub API.'
          )
        }
      }

      lines.push(
        `› URL: ${result.repoUrl}`,
        `› Waktu proses: ${(
          (performance.now() - started) / 1000
        ).toFixed(2)} detik`,
        '',
        'Source code dikemas dalam arsip ZIP.',
        '© ELYRA-AI'
      )

      await sock.message.send(
        m.chat,
        {
          type: 'document',
          media: outputStream,
          mimetype: 'application/zip',
          fileName: result.fileName || `${result.repo}.zip`,
          caption: lines.join('\n'),
        },
        {
          quote: m.raw,
        }
      )

      console.log(
        `[GITCLONE] ${result.owner}/${result.repo} ` +
        `branch=${result.branch} ` +
        `file=${result.filePath} ` +
        `duration=${(
          (performance.now() - started) / 1000
        ).toFixed(2)}s`
      )
    } catch (error) {
      if (outputStream && typeof outputStream.destroy === 'function') {
        outputStream.destroy()
      }

      console.error(
        '[GITCLONE] Error:',
        error?.stack || error?.message || error
      )

      return m.reply(
        '🍂 *GITHUB DOWNLOADER ERROR*\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        `› Pesan: ${String(
          error?.message || error || 'Unknown error'
        ).slice(0, 700)}\n` +
        '━━━━━━━━━━━━━━━━━━\n' +
        '© ELYRA-AI'
      )
    }
  },
}