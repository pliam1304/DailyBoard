import WidgetKit
import SwiftUI
#if canImport(AppKit)
import AppKit
typealias PlatformImage = NSImage
#elseif canImport(UIKit)
import UIKit
typealias PlatformImage = UIImage
#endif

// MARK: - CatyBoard Native macOS / iOS WidgetKit Starter (with Real Latest Polaroid Photo!)
// Drop this file into a macOS/iOS Widget Extension target in Xcode,
// fill in your Supabase project URL, anon key, user access token & boardId.

struct CatyWidgetConfig {
    static let supabaseURL = "https://YOUR_PROJECT.supabase.co"
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
    static let boardId = "YOUR_BOARD_UUID"
    static let userAccessToken = "YOUR_USER_JWT_OR_KEYCHAIN_TOKEN"
}

struct CatyWidgetEntry: TimelineEntry {
    let date: Date
    let boardTitle: String
    let catNames: String
    let pendingReminders: [String]
    let completedCount: Int
    let latestCaption: String
    let latestPhotoData: Data?
}

struct CatyTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> CatyWidgetEntry {
        CatyWidgetEntry(
            date: Date(),
            boardTitle: "CatyBoard",
            catNames: "Mochi & Latte",
            pendingReminders: ["Uống đủ nước", "Chụp 1 ảnh Polaroid"],
            completedCount: 2,
            latestCaption: "Always with you ♡",
            latestPhotoData: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CatyWidgetEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CatyWidgetEntry>) -> Void) {
        Task {
            let entry = await fetchLatestSummary() ?? placeholder(in: context)
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    private func authedRequest(url: URL, method: String = "GET", body: Data? = nil) -> URLRequest {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue(CatyWidgetConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(CatyWidgetConfig.userAccessToken)", forHTTPHeaderField: "Authorization")
        if let body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return req
    }

    private func fetchLatestSummary() async -> CatyWidgetEntry? {
        guard !CatyWidgetConfig.supabaseURL.contains("YOUR_PROJECT") else {
            return nil
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())

        do {
            // 1. Fetch today's reminders
            guard let remindersUrl = URL(
                string: "\(CatyWidgetConfig.supabaseURL)/rest/v1/reminders?board_id=eq.\(CatyWidgetConfig.boardId)&entry_date=eq.\(today)&select=title,completed"
            ) else { return nil }

            let (remData, _) = try await URLSession.shared.data(for: authedRequest(url: remindersUrl))
            struct RemRow: Decodable { let title: String; let completed: Bool }
            let remRows = try JSONDecoder().decode([RemRow].self, from: remData)
            let pending = remRows.filter { !$0.completed }.map(\.title)
            let done = remRows.filter(\.completed).count

            // 2. Fetch latest Polaroid photo metadata & download signed image
            var latestCaption = "Đồng bộ từ Supabase ✓"
            var photoBytes: Data? = nil

            if let photoMetaUrl = URL(
                string: "\(CatyWidgetConfig.supabaseURL)/rest/v1/day_photos?board_id=eq.\(CatyWidgetConfig.boardId)&order=created_at.desc&limit=1&select=storage_path,caption"
            ) {
                let (pData, _) = try await URLSession.shared.data(for: authedRequest(url: photoMetaUrl))
                struct PhotoRow: Decodable { let storage_path: String; let caption: String }
                if let latest = try JSONDecoder().decode([PhotoRow].self, from: pData).first {
                    latestCaption = latest.caption
                    if let signUrl = URL(
                        string: "\(CatyWidgetConfig.supabaseURL)/storage/v1/object/sign/daily-photos/\(latest.storage_path)"
                    ) {
                        let body = try JSONSerialization.data(withJSONObject: ["expiresIn": 3600])
                        let (signData, _) = try await URLSession.shared.data(
                            for: authedRequest(url: signUrl, method: "POST", body: body)
                        )
                        struct SignResp: Decodable { let signedURL: String }
                        if let signed = try? JSONDecoder().decode(SignResp.self, from: signData),
                           let imgUrl = URL(string: "\(CatyWidgetConfig.supabaseURL)/storage/v1\(signed.signedURL)") {
                            let (imgBytes, _) = try await URLSession.shared.data(from: imgUrl)
                            photoBytes = imgBytes
                        }
                    }
                }
            }

            return CatyWidgetEntry(
                date: Date(),
                boardTitle: "CatyBoard",
                catNames: "Mochi",
                pendingReminders: Array(pending.prefix(3)),
                completedCount: done,
                latestCaption: latestCaption,
                latestPhotoData: photoBytes
            )
        } catch {
            return nil
        }
    }
}

struct CatyBoardWidgetView: View {
    var entry: CatyWidgetEntry

    var body: some View {
        HStack(spacing: 12) {
            if let data = entry.latestPhotoData, let img = PlatformImage(data: data) {
                VStack(spacing: 4) {
                    #if canImport(AppKit)
                    Image(nsImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 96, height: 84)
                        .clipped()
                    #elseif canImport(UIKit)
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 96, height: 84)
                        .clipped()
                    #endif
                    Text(entry.latestCaption)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(red: 0.22, green: 0.15, blue: 0.10))
                        .lineLimit(1)
                }
                .padding(6)
                .background(Color.white)
                .cornerRadius(4)
                .shadow(radius: 2)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("🐾 \(entry.boardTitle)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundColor(Color(red: 0.22, green: 0.15, blue: 0.10))
                    Spacer()
                    Text("✓ \(entry.completedCount)")
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.24, green: 0.49, blue: 0.34))
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }

                Divider()

                if entry.pendingReminders.isEmpty {
                    Text("Hôm nay thật chill cùng \(entry.catNames) ♡")
                        .font(.system(size: 11))
                        .foregroundColor(Color(red: 0.35, green: 0.25, blue: 0.18))
                } else {
                    ForEach(entry.pendingReminders, id: \.self) { item in
                        HStack(spacing: 5) {
                            Circle()
                                .stroke(Color(red: 0.23, green: 0.46, blue: 0.66), lineWidth: 1.5)
                                .frame(width: 7, height: 7)
                            Text(item)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color(red: 0.22, green: 0.15, blue: 0.10))
                                .lineLimit(1)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(12)
        .containerBackground(Color(red: 0.98, green: 0.96, blue: 0.91), for: .widget)
    }
}

@main
struct CatyBoardWidget: Widget {
    let kind = "CatyBoardWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CatyTimelineProvider()) { entry in
            CatyBoardWidgetView(entry: entry)
        }
        .configurationDisplayName("CatyBoard Lofi & Polaroid")
        .description("Xem ảnh Polaroid mới nhất, lời nhắc & chú mèo ngay trên Desktop MacBook.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
