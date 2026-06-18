Ngữ cảnh: game chiến đấu theo lượt có điều kiện, là một phần trong hệ sinh thái Ling Thú.

Game play: trả lời đúng câu trắc nghiệm thì pet sẽ tấn công.

Thiết kế:

- 3 hệ kéo, búa, bao khắc chế xoay vòng. Kéo mạnh về atk, búa mạnh về phòng ngự, bao trung hòa cả 2
- mỗi user chỉ sở hữu 1 pet, tối đa level 40.
- pet ở level 10 mới được phép đánh PvP, nên chỉ cần cân bằng từ level 10 trở lên, nhưng vẫn cần đảm bảo có số lượt đánh tối thiểu để người chơi có thể trải nghiệm.
- mỗi pet có 4 thuộc tính: hp, atk, def, luck và một nội tại
- Thuộc tính và tăng trưởng là số thực, nhưng sát thương gây ra là số nguyên.
- Luck là chỉ số để tính ra tỉ lệ kích hoạt nội tại, công thức 1-0.99^(luck^0.75)
- nội tại của từng hệ, tỉ lệ kích hoạt dựa vào LUCK:
	+ Kéo: gây 110%-125% sát thương (tăng dần theo level). nếu HP của kéo > 75% thì gây 120%-150% sát thương (tăng dần theo level)
	+ Búa: giảm 10%-30% sát thương nhận vào trong 1 lượt đánh (tăng dần theo level). nếu HP của búa < 30% thì giảm 20-60% sát thương.
	+ Bao: hồi máu bằng 20-40% sát thương nhận vào khi bị tấn công (đã qua giảm sát thương bằng giáp), tăng lên 40-80% khi HP của Bao dưới 25%.
- def là số giáp, từ đây tính ra % giảm sát thương theo công thức 1-0.98^(def^0.8)
- level của pet được chia thành 3 giai đoạn: đầu game 10-20, giữa game 20-30, cuối game 30-40.

Cơ chế khắc chế giữa các hệ (Búa > Kéo > Bao > Búa):
- Kéo vs Búa: búa được tăng giáp (theo cấp)
- Búa vs Bao: Bao được tăng HP và luck (theo cấp)
- Bao vs Kéo: Kéo được tăng sát thương (theo cấp)

Cơ chế cùng hệ "We are family": khi 2 pet cùng hệ đấu với nhau sẽ có cơ chế cân bằng để đảm bảo trận đấu không quá ngắn hoặc quá dài, cụ thể:
	- Kéo vs Kéo: Giảm sát thương để tăng lượt đánh.
	- Búa vs Búa: Nặng về phòng ngự, cần giảm def để cân bằng lượt đánh.
	- Bao vs Bao: Kèo cân bằng, nếu quá trình thử nghiệm phát hiện cần nhiều lượt đánh hơn thì sẽ giảm HP để giảm lượt đánh. Nếu cân bằng thì cũng nên giảm nhẹ toàn bộ chỉ số để công bằng với các hệ khác.

Thăng tiến sức mạnh theo cấp: tăng riêng theo level (mỗi hệ có 1 giai đoạn tăng mạnh, các giai đoạn khác tăng chậm). Cần 1 table cụ thể cho 40 level để đảm bảo dễ chỉnh sửa và theo dõi, hãy bắt đầu với base hp quanh mốc 100 điểm cho mỗi hệ và điều chỉnh dần cho phù hợp.

Mục tiêu: có 2 mục tiêu:
1. Đảm bảo mỗi hệ có số lượt đánh tối thiểu theo từng level:
- Kéo: level 1 đạt trung bình 7.5 lượt đánh, tăng dần đều đến level 40 trung bình 16 lượt đánh
- Búa: level 1 9 lượt, level 40 đạt 20 lượt
- Bao: level 1 8 lượt, level 40 đạt 18 lượt

2. Đảm bảo các kèo khắc chế luôn thắng (dù đánh trước hay đánh sau, tỉ lệ thắng trung bình tốt nhất nên đạt 100%, thấp nhất 95%) với lượng HP còn lại của bên khắc chế dao động 10-35% trên toàn bộ giai đoạn (chỉ tính khi level >= 10)

Bạn được phép: Chỉnh sửa base attr và growth của từng hệ, chỉnh sửa công thức tính sát thương, chỉnh sửa công thức tính tỉ lệ kích hoạt nội tại, chỉnh sửa công thức tính giảm sát thương từ def, chỉnh sửa cơ chế khắc chế, chỉnh sửa cơ chế cùng hệ "We are family", chỉnh sửa thăng tiến sức mạnh theo cấp.

Bạn không được phép thay đổi vòng tròn khắc chế giữa các hệ (Búa > Kéo > Bao > Búa) và cơ chế cùng hệ "We are family" (Kéo vs Kéo, Búa vs Búa, Bao vs Bao). Các cơ chế này phải được giữ nguyên, nhưng bạn có thể chỉnh sửa chi tiết bên trong để đạt được mục tiêu.

Yêu cầu: viết lại 1 phiên bản hoàn toàn mới của combat_simulator (version 8, viết mới hoàn toàn) sau đó cân bằng đến khi đạt cả 2 mục tiêu ở trên, kiểm tra trên tập ít nhất 1000 trận đấu hoặc hơn (bao gồm bên khắc đi trước và đi sau), ở các mốc level 1, 5, 10, 15, 20, 25, 30, 35, 40. Không cần UI (tức không cần file html và css, chỉ cần chạy console), chỉ cần kết quả report khi chạy, không cần tạo file report .md. Kết quả report cần bao gồm:
- Chỉ số của từng hệ ở mỗi mốc level, bao gồm hp, atk, def, luck, gồm % giảm sát thương từ def, tỉ lệ kích hoạt nội tại.
- Số lượt đánh trung bình của từng hệ ở mỗi mốc level.
- Tỉ lệ thắng của từng hệ ở mỗi mốc level, bao gồm cả khi đi trước và đi sau.
- HP trung bình còn lại của hệ thắng trong các kèo khắc chế ở mỗi mốc level, bao gồm cả khi đi trước và đi sau.

Lưu ý: cần đảm bảo rằng các kèo khắc chế luôn thắng với lượng HP còn lại như yêu cầu ở mục tiêu 2, bất kể đi trước hay đi sau. Nếu không đạt được mục tiêu này, cần tiếp tục điều chỉnh và cân bằng cho đến khi đạt được. Tập trung cân bằng từ level 10 trở lên, nhưng vẫn cần đảm bảo có số lượt đánh tối thiểu để người chơi có thể trải nghiệm.

Độ ưu tiên của các mục tiêu: số lượt đánh trung bình của từng hệ ở mỗi mốc level > tỉ lệ thắng của từng hệ ở mỗi mốc level > HP trung bình còn lại của hệ thắng trong các kèo khắc chế ở mỗi mốc level.


Được phép tham khảo thông tin từ v7 (chỉ tham khảo, không sao chép, ver 7 đang dùng vòng tròn khắc chế khác truyền thống).