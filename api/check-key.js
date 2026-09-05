local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")
local CoreGui = game:GetService("CoreGui")

-- Cấu hình kết nối chính xác theo link Vercel của bạn
local SERVER_URL = "https://sever-dubo-hub.vercel.app/api/check-key"
local AUTH_TOKEN = "DUBO-KEY-04/01/2012"
local HWID = "HWID_" .. tostring(game:GetService("RbxAnalyticsService"):GetClientId())

-- Hàm mã hóa và giải mã dữ liệu cục bộ
local function encodeData(data)
    return HttpService:JSONEncode(data)
end

local function decodeData(str)
    local success, res = pcall(function()
        return HttpService:JSONDecode(str)
    end)
    if success then return res else return nil end
end

-- Kiểm tra xem đã có session hợp lệ lưu trong Workspace chưa
local function checkSavedSession()
    local savedFolder = Workspace:FindFirstChild("DuboHubSession")
    if savedFolder and savedFolder:FindFirstChild("Data") then
        local data = decodeData(savedFolder.Data.Value)
        if data and data.hwid == HWID then
            local timeLeft = (data.expiresAt / 1000) - os.time()
            if timeLeft > 0 then
                print("Key còn hạn! Thời gian sử dụng còn lại: " .. math.floor(timeLeft / 60) .. " phút.")
                return true
            else
                print("Key đã hết hạn! Vui lòng lấy lại key.")
                savedFolder:Destroy()
            end
        end
    end
    return false
end

-- Hàm khởi chạy tính năng chính sau khi vượt key thành công
local function startMainScript()
    print("Khởi chạy script chính thành công!")
    -- Đặt code Hub/Script chính của bạn vào đây
end

-- Nếu đã có session hợp lệ thì chạy luôn, khỏi hiện bảng key
if checkSavedSession() then
    startMainScript()
else
    -- Xóa bảng cũ nếu lỡ bật nhiều lần
    if CoreGui:FindFirstChild("DuboKeySystem") then
        CoreGui.DuboKeySystem:Destroy()
    end

    -- Tạo giao diện bảng Key System trực tiếp
    local ScreenGui = Instance.new("ScreenGui")
    ScreenGui.Name = "DuboKeySystem"
    ScreenGui.Parent = CoreGui

    local MainFrame = Instance.new("Frame")
    MainFrame.Size = UDim2.new(0, 400, 0, 220)
    MainFrame.Position = UDim2.new(0.5, -200, 0.5, -110)
    MainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    MainFrame.BorderSizePixel = 0
    MainFrame.Parent = ScreenGui

    local UICorner = Instance.new("UICorner")
    UICorner.CornerRadius = UDim.new(0, 8)
    UICorner.Parent = MainFrame

    local Title = Instance.new("TextLabel")
    Title.Size = UDim2.new(1, 0, 0, 40)
    Title.BackgroundTransparency = 1
    Title.Text = "DUBO HUB - KEY SYSTEM"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 18
    Title.Font = Enum.Font.GothamBold
    Title.Parent = MainFrame

    -- Nút Get Key
    local GetKeyBtn = Instance.new("TextButton")
    GetKeyBtn.Size = UDim2.new(0.85, 0, 0, 40)
    GetKeyBtn.Position = UDim2.new(0.075, 0, 0, 55)
    GetKeyBtn.BackgroundColor3 = Color3.fromRGB(0, 122, 255)
    GetKeyBtn.Text = "GET KEY"
    GetKeyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    GetKeyBtn.TextSize = 14
    GetKeyBtn.Font = Enum.Font.GothamBold
    GetKeyBtn.Parent = MainFrame

    local BtnCorner1 = Instance.new("UICorner")
    BtnCorner1.CornerRadius = UDim.new(0, 6)
    BtnCorner1.Parent = GetKeyBtn

    -- Ô nhập Key
    local KeyBox = Instance.new("TextBox")
    KeyBox.Size = UDim2.new(0.85, 0, 0, 40)
    KeyBox.Position = UDim2.new(0.075, 0, 0, 105)
    KeyBox.BackgroundColor3 = Color3.fromRGB(45, 45, 45)
    KeyBox.PlaceholderText = "Nhập key của bạn vào đây..."
    KeyBox.Text = ""
    KeyBox.TextColor3 = Color3.fromRGB(255, 255, 255)
    KeyBox.PlaceholderColor3 = Color3.fromRGB(150, 150, 150)
    KeyBox.TextSize = 14
    KeyBox.Font = Enum.Font.Gotham
    KeyBox.Parent = MainFrame

    local BoxCorner = Instance.new("UICorner")
    BoxCorner.CornerRadius = UDim.new(0, 6)
    BoxCorner.Parent = KeyBox

    -- Nút Submit
    local SubmitBtn = Instance.new("TextButton")
    SubmitBtn.Size = UDim2.new(0.85, 0, 0, 40)
    SubmitBtn.Position = UDim2.new(0.075, 0, 0, 155)
    SubmitBtn.BackgroundColor3 = Color3.fromRGB(40, 200, 64)
    SubmitBtn.Text = "SUBMIT KEY"
    SubmitBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    SubmitBtn.TextSize = 14
    SubmitBtn.Font = Enum.Font.GothamBold
    SubmitBtn.Parent = MainFrame

    local BtnCorner2 = Instance.new("UICorner")
    BtnCorner2.CornerRadius = UDim.new(0, 6)
    BtnCorner2.Parent = SubmitBtn

    -- Logic nút Get Key: Gửi HWID, gọi layma.net và tự copy link vào clipboard
    GetKeyBtn.MouseButton1Click:Connect(function()
        GetKeyBtn.Text = "Đang tạo link..."
        task.spawn(function()
            local success, response = pcall(function()
                return request({
                    Url = SERVER_URL,
                    Method = "POST",
                    Headers = {
                        ["Content-Type"] = "application/json",
                        ["Authorization"] = "Bearer " .. AUTH_TOKEN
                    },
                    Body = HttpService:JSONEncode({
                        action = "get_key",
                        hwid = HWID
                    })
                })
            end)

            if success and response and response.Success then
                local parseSuccess, data = pcall(function()
                    return HttpService:JSONDecode(response.Body)
                end)
                
                if parseSuccess and data and data.success then
                    GetKeyBtn.Text = "Đã Copy Link vào Clipboard!"
                    if setclipboard then
                        setclipboard(data.link)
                    end
                    task.wait(2.5)
                    GetKeyBtn.Text = "GET KEY"
                else
                    GetKeyBtn.Text = "Lỗi phản hồi từ Server!"
                    task.wait(2)
                    GetKeyBtn.Text = "GET KEY"
                end
            else
                GetKeyBtn.Text = "Lỗi kết nối Server!"
                task.wait(2)
                GetKeyBtn.Text = "GET KEY"
            end
        end)
    end)

    -- Logic nút Submit Key: Gửi key và HWID lên server so sánh
    SubmitBtn.MouseButton1Click:Connect(function()
        local userKey = KeyBox.Text
        if userKey == "" then
            SubmitBtn.Text = "Vui lòng nhập key!"
            task.wait(1.5)
            SubmitBtn.Text = "SUBMIT KEY"
            return
        end

        SubmitBtn.Text = "Đang kiểm tra..."
        task.spawn(function()
            local success, response = pcall(function()
                return request({
                    Url = SERVER_URL,
                    Method = "POST",
                    Headers = {
                        ["Content-Type"] = "application/json",
                        ["Authorization"] = "Bearer " .. AUTH_TOKEN
                    },
                    Body = HttpService:JSONEncode({
                        action = "submit_key",
                        key = userKey,
                        hwid = HWID
                    })
                })
            end)

            if success and response and response.Success then
                local parseSuccess, data = pcall(function()
                    return HttpService:JSONDecode(response.Body)
                end)

                if parseSuccess and data and data.success then
                    SubmitBtn.Text = "Thành công!"
                    
                    -- Lưu dữ liệu mã hóa thời gian và HWID xuống Workspace
                    local folder = Instance.new("Folder")
                    folder.Name = "DuboHubSession"
                    folder.Parent = Workspace

                    local val = Instance.new("StringValue")
                    val.Name = "Data"
                    val.Value = encodeData({
                        hwid = data.hwid,
                        expiresAt = data.expiresAt
                    })
                    val.Parent = folder

                    task.wait(1)
                    ScreenGui:Destroy()
                    startMainScript()
                else
                    SubmitBtn.Text = (data and data.message) or "Sai Key!"
                    task.wait(2)
                    SubmitBtn.Text = "SUBMIT KEY"
                end
            else
                SubmitBtn.Text = "Lỗi kết nối Server!"
                task.wait(2)
                SubmitBtn.Text = "SUBMIT KEY"
            end
        end)
    end)
end
